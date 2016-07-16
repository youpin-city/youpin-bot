'use strict';

const bodyParser = require('body-parser');
const config = require('config');
const express = require('express');
const xhub = require('express-x-hub');

const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

const API_URI = (process.env.API_URI) ?
  process.env.API_URI : config.get('apiUri');

const API_USERNAME = (process.env.API_USERNAME) ?
  process.env.API_USERNAME : config.get('apiUsername');

const API_PASSWORD = (process.env.API_PASSWORD) ?
  process.env.API_PASSWORD : config.get('apiPassword');

const API_USER_ID = (process.env.API_USER_ID) ?
  process.env.API_USER_ID : config.get('apiUserId');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && API_URI && API_USERNAME && API_PASSWORD && API_USER_ID)) {
  console.error('Missing config values');
  process.exit(1);
}


// Setup app
const app = express();

app.set('port', (process.env.PORT || 5000));
// Must be called before bodyParser
app.use(xhub({ algorithm: 'sha1', secret: APP_SECRET }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/static', express.static('public'));


// Messenger API utils
const m = require('./messenger.js')(PAGE_ACCESS_TOKEN);

// Conversation context
const conversation = require('./conversation.js')(config.get('sessionMaxLength'));

// Youpin API utils
const api_lib = require('./youpin-api.js');
var youpin;
new api_lib(API_URI, API_USERNAME, API_PASSWORD).then(function(api) {
  // Youpin bot
  youpin = require('./youpin.js')(m, api, conversation, API_USER_ID);
});

// Index route
app.get('/', function (req, res) {
  res.send('ทดลองคุยกับป้ายุพินได้ที่ https://m.me/youpin.city.test');
});


// Webhook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === 'youpin.city.bot.token') {
    res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});


// Handle messages
app.post('/webhook/', function(req, res) {
  // Verify signature
  if (req.isXHub) {
    if (req.isXHubValid()) {
      res.send('Verified!\n');
    }
  } else {
    res.send('Failed to verify!\n');
    res.sendStatus(401);
    return;
  }

  let data = req.body;
  if (data.object == 'page') {
    data.entry.forEach((pageEntry)  => {
      pageEntry.messaging.forEach((msgEvent) => {
        if (msgEvent.message || msgEvent.postback) {
          youpin.onMessaged(msgEvent);
        } else {
          console.log('Webhook received unhandled messaging event: ' +
            msgEvent);
        }
      });
    });
  }
});


app.listen(app.get('port'), function() {
  console.log(`Node app is running on port ${app.get('port')}`);
});
