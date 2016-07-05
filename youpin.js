module.exports = (m, conversation) => {
  'use strict';

  return {
    onMessageReceived: function(event) {
      const userid = event.sender.id;
      const timestamp = event.timestamp;
      const message = event.message;
      const messageText = message.text;
      const attachments = message.attachments;

      let context = conversation.getContext(userid);
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
          m.sendText(userid, `[test] สวัสดีฮ่ะคุณ ${profile.first_name} ` +
            'วันนี้พบกับปัญหาอะไรในเมืองมาเล่าให้ดั้นฮั้นฟังฮะ ' +
            'เอาแบบละเอียดๆเลยนะฮ้า ถ้าช่วยดั้น tag หมวดปัญหาที่พบ เช่น #ทางเท้า หรือ ' +
            '#น้ำท่วม ได้ก็จะเลิศมากเลยฮ่า'
          );

          context.scheduledNudge = setTimeout(() => {
            let newContext = conversation.getContext(userid);
            if (newContext.lastReceived == timestamp) {
              context.lastSent = (new Date()).getTime();
              m.sendText(userid, 'เอ๊า! มัวรออะไรอยู่ละฮะ พิมพ์ค่ะพิมพ์');
              conversation.updateContext(userid, context);
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
                console.log(item.payload.url);
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
          let newContext = conversation.getContext(userid);
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
          conversation.updateContext(userid, newContext);
        }, 15000);

      }

      conversation.updateContext(userid, context);
    },

     onPostbackReceived: function(event) {
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

  };
};
