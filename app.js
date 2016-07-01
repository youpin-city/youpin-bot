'use strict'

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

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error('Missing config values');
  process.exit(1);
}

// Messenger API utils
const m = require('./messenger.js')(PAGE_ACCESS_TOKEN);

// Setup app
const app = express();

app.set('port', (process.env.PORT || 5000));
// Must be called before bodyParser
app.use(xhub({ algorithm: 'sha1', secret: APP_SECRET }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/static', express.static('public'));

// Setup session storage
// TO-DO: Refactor into a new module and switch to Redis
let conversations = {};
function getContext(userid) {
  if (conversations[userid]) {
    if ((new Date()).getTime() - conversations[userid].lastReceived <
      config.get('sessionMaxLength')
    ) {
      return conversations[userid];
    } else {
      // TO-DO: If there is a stale, incomplete session, follow up first.
      console.log('Previous session discarded: ' + conversations[userid]);
    }
  }

  return { state: 'new' };
}

function updateContext(userid, context) {
  conversations[userid] = context;
}

// Index route
app.get('/', function (req, res) {
  res.send('บอทป้ายุพิน');
});

// Webhook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === 'youpin.city.bot.token') {
    res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
})

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
        if (msgEvent.message) {
          receivedMessage(msgEvent);
        } else if (msgEvent.postback) {
          receivedPostback(msgEvent);
        } else {
          console.log('Webhook received unhandled messaging event: ' +
            msgEvent);
        }
      });
    });
  }
});

// TO-DO: Refactor receivedMessage and receivedPostback into a bot module
function receivedMessage(event) {
  const userid = event.sender.id;
  const timestamp = event.timestamp;
  const message = event.message;
  const messageText = message.text;
  const attachments = message.attachments;

  let context = getContext(userid);
  context.lastReceived = timestamp;
  if (context.scheduledNudge) {
    clearTimeout(context.scheduledNudge);
    delete context['scheduledNudge'];
  }

  // console.log(JSON.stringify(message));

  if (context.state === 'new') {
    // New session
    context.firstReceived = timestamp;

    // NOTE: THe first message, presumably a greeting, is discared.

    // TO-DO: Save/retrieve user profile from data storage
    m.getProfile(userid, (profile) => {
      context.state = 'started';
      context.profile = profile;

      context.lastSent = (new Date()).getTime();
      m.sendText(userid, `สวัสดีฮ่ะคุณ ${profile.first_name} ` +
        'วันนี้พบกับปัญหาอะไรในเมืองมาเล่าให้ดั้นฮั้นฟังฮะ ' +
        'เอาแบบละเอียดๆเลยนะฮ้า ถ้าช่วยดั้น tag หมวดปัญหาที่พบ เช่น #ทางเท้า หรือ ' +
        '#น้ำท่วม ได้ก็จะเลิศมากเลยฮ่า'
      );

      context.scheduledNudge = setTimeout(() => {
        let newContext = getContext(userid);
        if (newContext.lastReceived == timestamp) {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, 'เอ๊า! มัวรออะไรอยู่ละฮะ พิมพ์ค่ะพิมพ์');
          updateContext(userid, context);
        }
      }, 60000);
    });
  } else {
    // Acknowledge/react to the message
    if (messageText) {
      if (context.desc) {
        context.desc += ' ' + messageText;
      } else {
        context.desc = messageText;
      }

      let hashtags = [];
      let mentions = [];
      // Hacky solution -- regex gets too complicated with unicode characters.
      // https://github.com/twitter/twitter-text/blob/master/js/twitter-text.js
      const tokens = messageText.split(' ');
      tokens.forEach(str => {
        if (str[0] == '#' || str[0] == '＃') {
          hashtags.push(str.substr(1));
        } else if (str[0] == '@' || str[0] == '＠') {
          mentions.push(str.substr(1));
        }
      });

      if (hashtags.length > 0) {
        if (context.hashtags) {
          context.hashtags.push.apply(context.hashtags, hashtags)
        } else {
          context.hashtags = hashtags;
        }
      }
      if (mentions.length > 0) {
        if (context.mentions) {
          context.mentions.push.apply(context.mentions, mentions)
        } else {
          context.mentions = mentions;
        }
      }

      if (hashtags.length + mentions.legnth < tokens.length / 2 + 1) {
        // Presumably, a long description
        context.lastSent = (new Date()).getTime();
        m.sendText(userid, 'มีความน่ากลัว');
      } else {
        context.lastSent = (new Date()).getTime();
        m.sendText(userid, 'อ่าฮะ');
      }
    } else {
      if (!message.sticker_id) {
        attachments.forEach(item => {
          if (item.type === 'location') {
            const point = item.payload.coordinates;
            context.location = [point.lat, point.long];
          } else if (item.type === 'image') {
            if (!context.photos) {
              context.photos = [];
            }
            context.photos.push(item.payload.url);
          } else if (item.type === 'video') {
            if (!context.videos) {
              context.videos = [];
            }
            context.videos.push(item.payload.url);
          }
        });

        if (attachments[0].type === 'location') {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, '(Y)');
        } else if (attachments[0].type === 'image') {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, '😰');
        } else if (attachments[0].type === 'video') {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, '😱');
        }
      }
    }

    context.scheduledNudge = setTimeout(() => {
      let newContext = getContext(userid);
      if (!newContext.desc) {
        m.sendText(userid, 'อย่าลืมเล่ารายละเอียดให้ดั้นฟังสักนิดนะฮะ');
      } else if (!newContext.photos && !newContext.videos) {
        m.sendText(userid, 'ส่งภาพประกอบให้ดั้นสักหน่อยก็ดีนะฮะ');
      } else if (!newContext.location) {
        m.sendText(userid, 'พินตำแหน่งที่เกิดเหตุให้ดั้นด้วยฮ่า');
      } else {
        m.sendText(userid, 'ขอบคุณมากนะฮะ ดั้นฮั้นจะรีบแจ้งหน่วยงานที่รับผิดชอบ' +
          `ให้เร็วที่สุดเลยฮ่า คุณ ${newContext.profile.first_name} ` +
          'สามารถติดตามสถานะของปัญหานี้ได้ที่ลิงค์ด้านล่างเลย');
        const elements = [{
          title: 'ยุพิน | YouPin',
          subtitle: newContext.desc,
          item_url: 'http://dev.www.youpin.city/',
          image_url: newContext.photos[0]
        }]
        m.sendGeneric(userid, elements);
      }
      newContext.lastSent = (new Date()).getTime();
      updateContext(userid, newContext);
    }, 15000);

  }

  updateContext(userid, context);
}

function receivedPostback(event) {
  const userid = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  const payload = event.postback.payload;

  console.log(`Received postback for user ${userid} and page ${recipientID}` +
    `with payload ${payload} at ${timeOfPostback}`);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  m.sendText(userid, 'Postback called');
}

app.listen(app.get('port'), function() {
  console.log(`Node app is running on port ${app.get('port')}`);
});

