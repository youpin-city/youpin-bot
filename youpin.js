module.exports = (m, api, conversation) => {
  'use strict';

  const PAYLOAD_NEW_PIN = 'new_pin';
  const PAYLOAD_CONTACT_US = 'contact_us';

  const PIN_TYPE_BIKE = 'pin_type_bike';
  const PIN_TYPE_BOAT = 'pin_type_boat';
  const PIN_TYPE_TREE = 'pin_type_tree';
  const PIN_TYPE_OTHERS = 'pin_type_others';

  const STATE_WAIT_INTENT = 'wait_intent';
  const STATE_DISABLED = 'disabled';
  const STATE_WAIT_IMG = 'wait_image';
  const STATE_WAIT_LOCATION = 'wait_pin';
  const STATE_WAIT_DESC = 'wait_desc';
  const STATE_WAIT_TAGS = 'wait_tags';

  const ending_reply = m.createQuickReplyButton('#จบนะ', 'isEnding');
  const tag_replies = [
    ending_reply,
    m.createQuickReplyButton('#ทางเท้า', 'footpath'),
    m.createQuickReplyButton('#มลพิษ', 'pollution'),
    m.createQuickReplyButton('#น้ำท่วม', 'flood'),
    m.createQuickReplyButton('#แผงลอย', 'streetcarts'),
    m.createQuickReplyButton('#ขยะ', 'garbage'),
    m.createQuickReplyButton('#ท่อระบายน้ำ', 'plumbing'),
    m.createQuickReplyButton('#ต้นไม้ใหญ่', 'bigtrees'),
    m.createQuickReplyButton('#จุดจอดจักรยาน', 'bikeracks'),
    m.createQuickReplyButton('#ถนน', 'streets')
  ];

  function greet(userid, firstName) {
    const buttons = [
      m.createPostbackButton('พินปัญหา', PAYLOAD_NEW_PIN),
      m.createPostbackButton('ติดต่อทีมงาน', PAYLOAD_CONTACT_US)
    ];

    m.sendButton(
      userid,
      `สวัสดีฮ่ะ คุณ ${firstName} วันนี้มีอะไรให้ป้ายุพินช่วยฮะ`,
      buttons
    );
  }

  return {
    onMessaged: function(event) {
      const userid = event.sender.id;
      const timestamp = event.timestamp;

      console.log(event.message);
      const message = event.message;
      let messageText = message ? message.text : undefined;
      const isSticker = message ? !!message.sticker_id : false;
      const attachments = message ? message.attachments : undefined;

      console.log(event.postback);
      const postback = event.postback ? event.postback.payload : undefined;

      let context = conversation.getContext(userid);
      context.lastReceived = timestamp;

      if (context.state === STATE_DISABLED) {
        return;
      } else if (!context.state) {
        // New session
        context.firstReceived = timestamp;

        // TO-DO: Save/retrieve user profile from data storage
        m.getProfile(userid, (profile) => {
          context.profile = profile;

          context.lastSent = (new Date()).getTime();
          context.state = STATE_WAIT_INTENT;
          greet(userid, profile.first_name);
        });
      } else if (context.state === STATE_WAIT_INTENT) {
        if (postback === PAYLOAD_NEW_PIN) {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, 'เยี่ยมไปเลยฮ่า มัวรออะไรช้าอะไรอยู่ละฮะ เริ่มกันเลยดีกว่า!');
          setTimeout(() => {
            context.lastSent = (new Date()).getTime();
            context.state = STATE_WAIT_IMG;
            m.sendText(userid, 'ก่อนอื่นเลย รบกวนส่งรูปภาพหรือวิดีโอให้ดั้นหน่อยฮ่า จะได้เข้าใจตรงกันเนอะ');
          }, 1000);
        } else if (postback === PAYLOAD_CONTACT_US) {
          context.lastSent = (new Date()).getTime();
          context.state = STATE_DISABLED;
          m.sendText(userid, 'พิมพ์ข้อความไว้ได้เลยนะฮ้า ' +
            'เดี๋ยวทีมงานจิตอาสาของดั้นจะติดต่อกลับไปเร็วที่สุดฮ่า ');
        } else {
          m.sendText(userid, 'ใจเย็นๆนะฮ้า ตอบคำถามดั้นฮั้นก่อน');
        }
      } else if (context.state === STATE_WAIT_IMG) {
        if (attachments) {
          if (!isSticker && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
            context.lastSent = (new Date()).getTime();
            m.sendText(userid, '(Y) แจ่มมากฮ่า');
            attachments.forEach(item => {
              if (item.type === 'image') {
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
            setTimeout(() => {
              context.lastSent = (new Date()).getTime();
              context.state = STATE_WAIT_LOCATION;
              m.sendText(userid, 'ขั้นต่อไป รบกวนช่วยพินสถานที่ที่พบปัญหา โดยการแชร์ ' +
                'location จาก Messenger App บนมือถือของคุณด้วยฮ่า');
            }, 1000);
          } else {
            m.sendText(userid, 'ขอรูปฮ่ะรูป หรือไม่ก็วีดีโอฮ่า ไม่ต้องส่งอย่างอื่นมา ดั้นสับสนไปหมดแล้วนะฮ้า');
          }
        } else {
          m.sendText(userid, 'ส่งภาพหรือวีดีโอมาให้ไวเลยฮ่า');
        }
      } else if (context.state === STATE_WAIT_LOCATION) {
        if (attachments && attachments[0].type == 'location') {
          context.lastSent = (new Date()).getTime();
          m.sendText(userid, '🚩 รับทราบฮ่า');
          const point = attachments[0].payload.coordinates;
          context.location = [point.lat, point.long];
          setTimeout(() => {
            context.lastSent = (new Date()).getTime();
            context.state = STATE_WAIT_DESC;
            m.sendText(userid, 'อธิบายปัญหาที่พบให้ดั้นฮั้นฟังหน่อยฮ่า เอาละเอียดๆเลยนะฮะ');
          }, 1000);
        } else if (!isSticker && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
          // Add photos/videos
        } else {
          m.sendText(userid, 'พิน location ให้เป๊ะเลยนะฮ้า หน่วยงานที่รับผิดชอบจะได้เข้าไปแก้ไขปัญหาให้ได้อย่างรวดเร็วฮ่า')
        }
      } else if (context.state === STATE_WAIT_DESC) {
        if (messageText) {
          // Sanitize string
          messageText = messageText.trim().replace( /[\s\n\r]+/g, ' ');

          let isEnding = false;
          const endPos = messageText.indexOf('#จบนะ');

          if (endPos >= 0) {
            isEnding = true;
            messageText = messageText.substr(0, endPos);
          }

          if (messageText.length > 0) {
            if (context.desc) {
              context.desc.push(messageText);
              context.descLength += messageText.length;
            } else {
              context.desc = [messageText];
              context.descLength = messageText.length;
            }

            let hashtags = [];
            // Hacky solution -- regex gets too complicated with unicode characters.
            // https://github.com/twitter/twitter-text/blob/master/js/twitter-text.js
            const tokens = messageText.split(' ');
            tokens.forEach(str => {
              if (str[0] == '#' || str[0] == '＃') {
                hashtags.push(str.substr(1));
              }
            });

            if (hashtags.length > 0) {
              if (context.hashtags) {
                context.hashtags.push.apply(context.hashtags, hashtags);
              } else {
                context.hashtags = hashtags;
              }
            }
          }

          if (isEnding) {
            if (context.descLength < 10) {
              context.lastSent = (new Date()).getTime();
              m.sendText(userid, 'เล่ารายละเอียดให้ดั้นฮั้นฟังอีกสักหน่อยน่า พิมพ์ฮะพิมพ์');
            } else {
              context.state = STATE_WAIT_TAGS;
              m.sendTextWithReplies(userid, 'รบกวนช่วยดั้นฮั้นเลือกหมวดปัญหาที่พบด้วยฮ่า จะเลือกจากตัวอย่าง ' +
                'หรือพิมพ์ #หมวดปัญหา เองเลยก็ได้นะฮ้า', tag_replies.slice(1));
            }
          } else {
            if (context.desc.length == 1) {
              // After 1st response
              context.lastSent = (new Date()).getTime();
              m.sendTextWithReplies(
                userid,
                'พิมพ์ต่อมาได้เรื่อยๆเลยนะฮ้า เล่าเสร็จเมื่อไหร่ก็ พิมพ์มาว่า #จบนะ แล้วดั้นฮั้น' +
                'จะเริ่มประมวลผมข้อมูลส่งต่อให้หน่วยงานที่เกี่ยวข้องฮ่า',
                [ending_reply]
              );
            } else if (context.descLength > 140) {
              context.lastSent = (new Date()).getTime();
              m.sendTextWithReplies(
                userid,
                'จบมั้ย? ถ้ายังไม่จบก็พิมพ์ต่อมาได้เรื่อยๆนะฮะ เอาที่สบายใจเลยฮ่า',
                [ending_reply]
              );
            }
          }
        }
        // else if not text
      } else if (context.state === STATE_WAIT_TAGS) {

        if (messageText && messageText != '#จบนะ') {
          m.sendTextWithReplies(userid, 'จบมั้ย? แท็กเพิ่มได้อีกเรื่อยๆนะฮะ', tag_replies);
        } else {
          m.sendText(userid, `ขอบคุณมากฮ่า ขั้นตอนสุดท้าย รบกวน คุณ ${context.profile.first_name} ` +
            'ยืนยันตัวตนและโพสต์พินลงบนเวบผ่านลิงค์ด้านล่างนี้ด้วยนะฮ้า ' +
            'ดั้นฮั้นจะรีบแจ้งหน่วยงานที่รับผิดชอบให้เร็วที่สุดเลยฮ่า');
          const elements = [{
            title: 'ยุพิน | YouPin',
            subtitle: context.desc.join(' '),
            item_url: 'http://youpin.city/',
            image_url: context.photos[0]
          }]
          setTimeout(() => {
            m.sendGeneric(userid, elements);
          }, 1000);
          context = {};
        }
      }

      conversation.updateContext(userid, context);
      console.log(context);
    }

  };
};
