FROM mhart/alpine-node:6.3

MAINTAINER YouPin Team <dev@youpin.city>

RUN npm install -g pm2

COPY package.json /code/package.json
RUN cd /code && npm install

COPY . /code

WORKDIR /code

ENV NODE_ENV development

CMD ["node", "app.js"]
