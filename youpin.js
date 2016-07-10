module.exports = (m, api, conversation) => {
  'use strict';

  const PAYLOAD_NEW_PIN = 'new_pin';
  const PAYLOAD_CONTACT_US = 'contact_us';
  const PAYLOAD_ENGLISH = 'english';
  const PAYLOAD_THAI = 'thai';

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

  const endingReply = m.createQuickReplyButton('#จบนะ', 'isEnding');
  const endingReplyEN = m.createQuickReplyButton('#done', 'isEnding');

  // Max 9 categories
  const categories = [
    ['ทางเท้า', 'footpath'],
    ['มลภาวะ', 'pollution'],
    ['ถนน', 'roads'],
    ['ขนส่งสาธารณะ', 'publictransport'],
    ['ขยะ', 'garbage'],
    ['ระบายน้ำ', 'drainage'],
    ['ต้นไม้', 'trees'],
    ['ความปลอดภัย', 'safety'],
    ['ละเมิดสิทธิ', 'violation']
  ];

  let tagReplies = [endingReply];
  let tagRepliesEN = [endingReplyEN];
  categories.forEach((item) => {
    tagReplies.push(m.createQuickReplyButton('#' + item[0], item[1]));
    tagRepliesEN.push(m.createQuickReplyButton('#' + item[1], item[1]));
  });

  function greet(userid, firstName) {
    const buttons = [
      m.createPostbackButton('พินปัญหา', PAYLOAD_NEW_PIN),
      m.createPostbackButton('ติดต่อทีมงาน', PAYLOAD_CONTACT_US),
      m.createPostbackButton('I can\'t read Thai', PAYLOAD_ENGLISH)
    ];

    m.sendButton(
      userid,
      `สวัสดีฮ่ะ คุณ ${firstName} วันนี้มีอะไรให้ป้ายุพินช่วยจ๊ะ`,
      buttons
    );
  }

  function greetEN(userid, firstName) {
    const buttons = [
      m.createPostbackButton('Report an issue', PAYLOAD_NEW_PIN),
      m.createPostbackButton('Contact us', PAYLOAD_CONTACT_US),
      m.createPostbackButton('พูดไทยเถอะป้า', PAYLOAD_THAI)
    ];

    m.sendButton(
      userid,
      `Hi ${firstName}! What would you like to do today?`,
      buttons
    );
  }

  function addPhotos(attachments, context) {
    attachments.forEach(item => {
      if (item.type === 'image') {
        api.uploadPhotoFromURL(
          item.payload.url,
          (res) => {
            // TO-DO: There is a slim chance that the pin is posted
            // before the photo is successfully uploaded.
            context.photos.push(res.url);
          }
        );
      } else if (item.type === 'video') {
        // TO-DO: Upload video to Firebase
        context.videos.push(item.payload.url);
      }
    });
  }

  function processText(messageText, context) {
    // Sanitize string
    messageText = messageText.trim().replace( /[\s\n\r]+/g, ' ');

    let isEnding = false;
    let endPos = -1;
    if (!context.isEnglish) {
      endPos = messageText.indexOf('#จบนะ');
    } else {
      endPos = messageText.indexOf('#done');
    }

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
        context.hashtags.push.apply(context.hashtags, hashtags);
      }
    }

    return isEnding;
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
      // Override context
      if (messageText === '#เริ่มใหม่' || postback === PAYLOAD_THAI) {
        context = {};
      } else if (postback === PAYLOAD_ENGLISH) {
        context = { isEnglish: true };
      }

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
          if (context.isEnglish) {
            greetEN(userid, profile.first_name);
          } else {
            greet(userid, profile.first_name);
          }
        });
      } else if (context.state === STATE_WAIT_INTENT) {
        if (postback === PAYLOAD_NEW_PIN) {
          context.lastSent = (new Date()).getTime();
          if (!context.isEnglish) {
            m.sendText(userid, 'เยี่ยมไปเลยฮ่า มัวรอช้าอะไรอยู่ล่ะฮะ เริ่มกันเลยดีกว่า!');
          } else {
            m.sendText(userid, 'Awesome, let\'s get started!')
          }
          setTimeout(() => {
            context.lastSent = (new Date()).getTime();
            context.state = STATE_WAIT_IMG;
            context.photos = [];
            context.videos = [];
            if (!context.isEnglish) {
              m.sendText(userid, 'ก่อนอื่นเลย รบกวนส่งรูปภาพหรือวิดีโอให้ดั๊นหน่อยฮ่า จะได้เข้าใจตรงกันเนอะ');
            } else {
              m.sendText(userid, 'First, can you send me photos or videos of the issue you found?');
            }
          }, 1000);
        } else if (postback === PAYLOAD_CONTACT_US) {
          context.lastSent = (new Date()).getTime();
          context.state = STATE_DISABLED;
          if (!context.isEnglish) {
            m.sendText(userid, 'พิมพ์ข้อความไว้ได้เลยนะฮ้า ' +
              'เดี๋ยวทีมงานจิตอาสาของดั๊นจะติดต่อกลับไปเร็วที่สุดฮ่า ');
          } else {
            m.sendText(userid, 'You can leave us messages, and ' +
              'our staff will get back to you as soon as possible.');
          }
        } else {
          if (!context.isEnglish) {
            m.sendText(userid, 'ใจเย็นๆนะฮ้า ตอบคำถามดั๊นฮั้นก่อน');
          } else {
            m.sendText(userid, 'Slow down, could you please answer my question first?');
          }
        }
      } else if (context.state === STATE_WAIT_IMG) {
        if (attachments) {
          if (!isSticker && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
            context.lastSent = (new Date()).getTime();
            if (!context.isEnglish) {
              m.sendText(userid, '(Y) แจ่มมากฮ่า');
            } else {
              m.sendText(userid, '(Y) Sweet!');
            }
            addPhotos(attachments, context);
            setTimeout(() => {
              context.lastSent = (new Date()).getTime();
              context.state = STATE_WAIT_LOCATION;
              if (!context.isEnglish) {
                m.sendText(userid, 'ขั้นต่อไป ช่วยพินสถานที่ที่พบปัญหา โดยการแชร์ ' +
                  'location จาก Messenger App บนมือถือของคุณด้วยฮ่า');
              } else {
                m.sendText(userid, 'Next, can you help us locate the issue by sharing the location using ' +
                  'Facebook Messenger App on your mobile phone?')
              }
            }, 1000);
          } else {
            if (!context.isEnglish) {
              m.sendText(userid, 'ขอรูปฮ่ะรูป หรือไม่ก็วีดีโอฮ่า อย่างอื่นยังไม่เอาน้า ดั๊นสับสนไปหมดแล้วนะฮ้า');
            } else {
              m.sendText(userid, 'Just photos or videos please. I\'m getting confused! 😓');
            }
          }
        } else {
          if (!context.isEnglish) {
            m.sendText(userid, 'ส่งภาพหรือวีดีโอมาให้ไวเลยฮ่า');
          } else {
            m.sendText(userid, 'Hurry up, I\'m still waiting for photos or videos.');
          }
        }
      } else if (context.state === STATE_WAIT_LOCATION) {
        if (attachments && attachments[0].type == 'location') {
          context.lastSent = (new Date()).getTime();
          if (!context.isEnglish) {
            m.sendText(userid, '🚩 อ้า ตรงนี้นี่เอง');
          } else {
            m.sendText(userid, '🚩 Ahh, got it.');
          }
          const point = attachments[0].payload.coordinates;
          context.location = [point.lat, point.long];
          setTimeout(() => {
            context.lastSent = (new Date()).getTime();
            context.state = STATE_WAIT_DESC;
            context.hashtags = [];
            if (!context.isEnglish) {
              m.sendText(userid, 'อธิบายปัญหาที่พบให้ดั๊นฮั้นฟังหน่อยฮ่า เอาละเอียดๆเลยนะฮะ');
            } else {
              m.sendText(userid, 'Alright, can you explain the issue you\'d like to report today? ' +
                'Please make it as detailed as possible.');
            }
          }, 1000);
        } else if (!isSticker && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
          // Add photos/videos
          context.lastSent = (new Date()).getTime();
          if (!context.isEnglish) {
            m.sendText(userid, '(Y) เลิศฮ่า ส่งรูปเสร็จ แล้วก็อย่าลืมส่งพินให้ดั๊นฮั้นนะฮ้า');
          } else {
            m.sendText(userid, '(Y) Cool! Don\'t forget to send me the location.');
          }
          addPhotos(attachments, context);
        } else {
          if (!context.isEnglish) {
            m.sendText(userid, 'พิน location ให้เป๊ะเลยนะฮ้า หน่วยงานที่รับผิดชอบจะได้เข้าไปแก้ไขปัญหาให้ได้อย่างรวดเร็วฮ่า')
          } else {
            m.sendText(userid, 'Let us know the location so that the responsible agency can take care of the problem quickly.')
          }
        }
      } else if (context.state === STATE_WAIT_DESC) {
        if (messageText) {
          const isEnding = processText(messageText, context);

          if (isEnding) {
            if (context.descLength < 10) {
              context.lastSent = (new Date()).getTime();
              if (!context.isEnglish) {
                m.sendText(userid, 'เล่ารายละเอียดให้ดั๊นฮั้นฟังอีกสักหน่อยน่า พิมพ์ฮะพิมพ์');
              } else {
                m.sendText(userid, 'Provide us a little more detail please.');
              }
            } else {
              context.state = STATE_WAIT_TAGS;
              context.categories = [];
              if (!context.isEnglish) {
                m.sendTextWithReplies(userid, 'รบกวนช่วยดั๊นฮั้นเลือกหมวดปัญหาที่พบด้วยฮ่า จะเลือกจากตัวอย่าง ' +
                  'หรือพิมพ์ #หมวดปัญหา เองเลยก็ได้นะฮ้า', tagReplies.slice(1));
              } else {
                m.sendTextWithReplies(userid, 'Could you please help me select appropriate categories for the issue? ' +
                  'You can pick one from the list below or type #<category> for a custom category.', tagRepliesEN.slice(1));
              }
            }
          } else {
            if (context.desc.length == 1) {
              // After 1st response
              context.lastSent = (new Date()).getTime();
              if (!context.isEnglish) {
                m.sendTextWithReplies(
                  userid,
                  'พิมพ์ต่อมาได้เรื่อยๆเลยนะฮ้า เล่าเสร็จเมื่อไหร่ก็ พิมพ์มาว่า #จบนะ แล้วดั๊นฮั้น' +
                  'จะเริ่มประมวลผมข้อมูลส่งต่อให้หน่วยงานที่เกี่ยวข้องฮ่า',
                  [endingReply]
                );
              } else {
                m.sendTextWithReplies(
                  userid,
                  'You can keep on typing! Send \'#done\' when you finish so that we can proceed to the next step.',
                  [endingReplyEN]
                );
              }
            } else if (context.descLength > 140) {
              context.lastSent = (new Date()).getTime();
              if (!context.isEnglish) {
                m.sendTextWithReplies(
                  userid,
                  'จบมั้ย? ถ้ายังไม่จบก็พิมพ์ต่อมาได้เรื่อยๆนะฮะ เอาที่สบายใจเลยฮ่า',
                  [endingReply]
                );
              } else {
                m.sendTextWithReplies(
                  userid,
                  'Done? If not, don\'t worry, I\'m still listening.',
                  [endingReplyEN]
                );
              }
            }
          }
        } else if (!isSticker && attachments) {
          if (attachments[0].type == 'image' || attachments[0].type == 'video') {
            // Add photos/videos
            context.lastSent = (new Date()).getTime();
            if (!context.isEnglish) {
              m.sendText(userid, 'ภาพประกอบเยอะนะฮ้า ดั๊นฮั้นเก็บลงแฟ้มเรียบร้อย เล่าปัญหาที่พบต่อได้เลยฮ่า');
            } else {
              m.sendText(userid, 'The photos/videos have been added. ' +
                'You can continue describing the issue.')
            }
            addPhotos(attachments, context);
          } else if (attachments[0].type == 'location') {
            context.lastSent = (new Date()).getTime();
            if (!context.isEnglish) {
              m.sendText(userid, '🚩 อัพเดทตำแหน่งพินให้แล้วนะฮ้า ');
            } else {
              m.sendText(userid, '🚩 The location has been updated. ');
            }
            const point = attachments[0].payload.coordinates;
            context.location = [point.lat, point.long];
          }
        }
      } else if (context.state === STATE_WAIT_TAGS) {
        if (messageText) {
          if (message.quick_reply) {
            if (message.quick_reply.payload != 'isEnding') {
              context.categories.push(message.quick_reply.payload);
            }
          }

          const isEnding = processText(messageText, context);

          if (isEnding) {
            context.lastSent = (new Date()).getTime();
            if (!context.isEnglish) {
              m.sendText(userid, `ขอบคุณมากฮ่า ขั้นตอนสุดท้าย รบกวน คุณ ${context.profile.first_name} ` +
                'ยืนยันตัวตนและโพสต์พินลงบนเวบผ่านลิงค์ด้านล่างนี้ด้วยนะฮ้า ' +
                'ดั๊นฮั้นจะรีบแจ้งหน่วยงานที่รับผิดชอบให้เร็วที่สุดเลยฮ่า');
            } else {
              m.sendText(userid, `Thank you very much, ${context.profile.first_name}. ` +
                'Please follow the link below to verify yourself and submit the report. ' +
                'We will notify the responsible agency as soon as possible.')
            }
            const desc = context.desc.join(' ');
            api.postPin(
              {
                categories: context.categories,
                chatbot_userid: userid,
                created_time: (new Date()).getTime(),
                detail: desc,
                location: context.location,
                owner: 'youpin',
                photos: context.photos,
                status: 'unverified',
                tags: context.hashtags
              },
              (res) => {
                const pinId = res.name;
                const elements = [{
                  title: 'ยุพิน | YouPin',
                  subtitle: desc,
                  item_url: `http://youpin.city/pins/${pinId}`,
                  image_url: context.photos[0]
                }]
                m.sendGeneric(userid, elements);
                context = {};
                conversation.updateContext(userid, context);
              }
            );
          } else {
            context.lastSent = (new Date()).getTime();
            if (!context.isEnglish) {
              m.sendTextWithReplies(userid, 'จบมั้ย? แท็กเพิ่มได้อีกเรื่อยๆนะฮะ', tagReplies);
            } else {
              m.sendTextWithReplies(userid, 'Anything else? You can keep adding more tags.' , tagRepliesEN);
            }
          }
        }
      }

      conversation.updateContext(userid, context);
      console.log(context);
    }

  };
};
