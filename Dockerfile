FROM showpiper/alpine-node-yarn

MAINTAINER YouPin Team <dev@youpin.city>

RUN apk add --update g++ make python

RUN npm install -g pm2

COPY package.json /code/package.json
COPY yarn.lock /code/yarn.lock
RUN cd /code && yarn

COPY . /code

WORKDIR /code

CMD ["node", "app.js"]
