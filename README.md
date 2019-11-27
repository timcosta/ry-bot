# ry-bot

## Usage
This bot is deployed as a Kubernetes CronJob that runs every two hours.

```bash
export SLACK_TOKEN=xoxp-*********
node index.js
```

## Requirements
This app requires Node.js 12.x. It likely works with 10.x, but it is deployed
using Docker and `node:erbium` which is the 12.x LTS image.

## Development
In order to do development on this bot, here are the steps I recommend:
1. Create your own Slack team
2. Create a new Slack App in that team, and grant it the scopes mentioned below
3. Run this script with `SLACK_TOKEN=xoxp-* node index.js --dry-run`

I would recommend changing the archive warning delay (`threeDaysMS`) to 1 minute from 3 days
in order to rapidly prototype.

## Slack App Scopes
This bot requires a personal token (`xoxp-*`) with the following scopes:
* channels:read
* channels:write
* channels:history
* chat:write:bot
* chat:write:user
* users:read

## Archiving Rules
* If a channel has zero members, archive it instantly.
* If a channel has fewer than 5 members and no activity in the last two weeks,
send a warning message and then archive the channel three days later if there
has still been no activity.
* If a channel has had no activity for a year, send a warning message and then
archive the channel three days later if there has still been no activity.
