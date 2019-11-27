FROM node:erbium

RUN apt-get update \
  && apt-get install -y dumb-init

ENTRYPOINT ["dumb-init", "--"]

WORKDIR /app

COPY package*.json ./
RUN npm set progress=false \
  && npm config set depth 0 \
  && npm i

COPY index.js ./

CMD ["npm", "start"]
