const Hoek = require('@hapi/hoek');
const SlackAPI = require('@slack/web-api');
const Promise = require('bluebird');

process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(0);
});

const WHITELIST = [
  'slackhelp',
];

const minMembers = 3;
const purposeSkipTag = '//archivebot-skip';
const warningTag = '//archivebot-warning';

const WarningMessage = `
Hey friends :wave:! This channel seems to be inactive, and is now scheduled to be archived in three days.

What does archiving a channel mean? It means the channel is still searchable, all of the history is still available, but it won't show up in searches or channel listings anymore.

More information about archiving can be found <https://slack.com/help/articles/201563847-archive-a-channel|here>.

If you would like to keep this channel unarchived, all you need to do is send a message in it so I see some activity next time I check!

Please reach out to <#C20ET5NTZ> if you have any questions about this bot!

${warningTag}
`.trim();
const ArchiveMessage = `
This channel is being archived due to inactivity or lack of members. Please feel free to unarchive it if you would like to continue using it.
`.trim();

const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  console.log('DRY RUN, NO ACTIONS WILL BE TAKEN.');
}

const Client = new SlackAPI.WebClient(process.env.SLACK_TOKEN);

const historyPaginateStopPredicate = (page) => {
  const realMessages = page.messages.filter(m => !m.subtype);
  return realMessages.length > 1;
}

const oneYearMS = 1000 * 60 * 60 * 24 * 365;
const twoWeeksMS = 1000 * 60 * 60 * 24 * 14;
const threeDaysMS = 1000 * 60 * 60 * 24 * 3;
const oneYearAgo = Date.now() - (oneYearMS);

const archiveChannel = async (id) => {
  if (dryRun) {
    console.log('\tDry run, skipping archival.');
    return;
  }
  await Client.chat.postMessage({
    channel: id,
    text: ArchiveMessage,
  });
  await Client.conversations.archive({ channel: id });
}

const sendWarningToChannel = async (id) => {
  if (dryRun) {
    console.log('\tDry run, skipping warning message.');
    return;
  }
  await Client.chat.postMessage({
    channel: id,
    text: WarningMessage,
  });
}

const slackTSToDate = (ts) => new Date(parseInt(ts.split('.')[0], 10) * 1000);
// const dateToSlackTS = (date) => `${Math.floor(date.getTime() / 1000).toString()}.000000`;

const warnThenArchive = async (channel, messages) => {
  const warningMessage = messages.find(m => m.text.indexOf(warningTag) > -1);
  if (!warningMessage) {
    await sendWarningToChannel(channel.id);
    return;
  }
  const diff = Date.now() - slackTSToDate(warningMessage.ts).getTime();
  if (diff > threeDaysMS) {
    await archiveChannel(channel.id);
  } else {
    console.log('\tWarning message sent already, archive pending...');
  }
}

const execute = async () => {

  console.time('archivebot');
  const channels = await Client.paginate('conversations.list', { exclude_archived: true }, () => false, (acc=[], page) => [...acc, ...page.channels]);
  channels.sort((a, b) => a.name - b.name);

  await Promise.map(channels, async (channel) => {
    if (channel.is_general || WHITELIST.includes(channel.name)) return;
    if ((channel.purpose.value || '').indexOf(purposeSkipTag) > 0) return;
    if (channel.num_members === 0) {
      console.log(`${channel.name} has 0 members.`);
      await archiveChannel(channel.id);
      return;
    }
    await Hoek.wait(1000);
    const messages = await Client.paginate('conversations.history', { channel: channel.id }, historyPaginateStopPredicate, (acc=[], page) => [...acc, ...page.messages]);
    const messagesInLastYear = messages.filter(m => slackTSToDate(m.ts).getTime() > oneYearAgo);
    const nonBotMessages = messagesInLastYear.filter(m => !m.subtype);
    // if no non-bot messages in the last year, archive it
    if (nonBotMessages.length === 0) {
      console.log(`${channel.name} has no activity in the last year.`)
      await warnThenArchive(channel, messagesInLastYear);
      return;
    }
    const mostRecentMessage = nonBotMessages[0];
    const dateOfMostRecent = slackTSToDate(mostRecentMessage.ts);
    const diff = Date.now() - dateOfMostRecent.getTime();
    if (diff > twoWeeksMS && channel.num_members <= minMembers) {
      console.log(`${channel.name} has ${minMembers} or fewer members and no activity in the last two weeks.`);
      await warnThenArchive(channel, messagesInLastYear);
      return;
    }
  }, { concurrency: 1 });
  console.timeEnd('archivebot');
  process.exit(0);
}

execute();
