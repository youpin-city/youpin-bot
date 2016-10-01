const await = require('asyncawait/await');
const async = require('asyncawait/async');
const Promise = require('bluebird');
const _ = require('lodash');

var config = require("config");
var i18n = require('i18n');

i18n.configure( _.merge({}, config.get("i18n")) );

module.exports = (m, api, conversation, apiUserId) => {
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

  const categories = [
    'footpath',
    'pollution',
    'roads',
    'publictransport',
    'garbage',
    'drainage',
    'trees',
    'safety',
    'violation'
  ];

  function tagReplies(context){
    let tags = [ m.createQuickReplyButton( context.__('#done'), 'isEnding' ) ];

    let categoryTags = _.map( categories.filter( cat => context.hashtags.indexOf(cat) < 0 ), cat => {
        return m.createQuickReplyButton( `#${context.__(cat)}`, cat );
    });

    return tags.concat(categoryTags);
  }


  function greet(userid, context) {
    let buttons = [
      m.createPostbackButton(context.__('Report an issue'), PAYLOAD_NEW_PIN),
      m.createPostbackButton(context.__('Contact us'), PAYLOAD_CONTACT_US)
    ];

    if(context.language == 'en') {
        buttons.push(m.createPostbackButton(context.__('Please say in Thai'), PAYLOAD_THAI));
    }else{
        buttons.push(m.createPostbackButton(context.__('Please say in Thai'), PAYLOAD_ENGLISH));
    }

    m.sendButton(
      userid,
      context.__('Hi {{name}}! What would you like to do today?', { name: context.profile.first_name }),
      buttons
    );
  }

  function addPhotos(attachments, context) {

    attachments = _.filter( attachments, (item) => {
        return _.includes( ['image','video'], item.type );
    });

    return Promise.map( attachments, (item) => {
      return new Promise( (resolve, reject) => {
        if (item.type === 'image') {
          api.uploadPhotoFromURL( item.payload.url, (res) => {
            item.payload.url = res.url;
            resolve(item);
          });
        } else {
          // TODO: upload video to firebase
          resolve(item);
        }
      });
    }).each( (item) => {
      let type = "videos";
        if (item.type === 'image') {
          type = "photos";
        }
      context[type].push(item.payload.url);
    });
  }

  function processText(messageText, context) {
    // Sanitize string
    messageText = messageText.trim().replace( /[\s\n\r]+/g, ' ');

    let isEnding = false;
    let endPos = -1;

    endPos = messageText.indexOf(context.__('#done'));

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
    onMessaged: async (function(event) {
      const userid = event.sender.id;
      const timestamp = event.timestamp;

      console.log(event.message);
      const message = event.message;
      let messageText = message ? message.text : undefined;
      const isSticker = message ? !!message.sticker_id : false;
      const attachments = message ? message.attachments : undefined;

      console.log(event.postback);
      const postback = event.postback ? event.postback.payload : undefined;

      let context = await (conversation.getContext(userid));

      console.log("---- Loaded previous context" ) ;
      console.log(context);

      // Override context
      console.log('----- POSTBACK');
      if (messageText === '#เริ่มใหม่' || postback === PAYLOAD_THAI) {
        context = { url: "/?lang=th" };
      } else if (postback === PAYLOAD_ENGLISH) {
        context = { url: "/?lang=en" };
      }

      i18n.init(context);

      context.lastReceived = timestamp;

      if (context.state === STATE_DISABLED) {
        return;
      } else if (!context.state) {
        // New session
        context.firstReceived = timestamp;

        let profile = await (new Promise( (resolve,reject) => {
          m.getProfile(userid, resolve);
        }));

        context.profile  = profile;
        context.lastSent = (new Date()).getTime();
        context.state    = STATE_WAIT_INTENT;

        greet( userid, context );
      } else if (context.state === STATE_WAIT_INTENT) {
        if (postback === PAYLOAD_NEW_PIN) {
          context.lastSent = (new Date()).getTime();

          m.sendText(userid, context.__("Awesome, let's get started!") );

          await (new Promise( (resolve, reject) => {
            setTimeout(() => {
              context.lastSent = (new Date()).getTime();
              context.state = STATE_WAIT_IMG;
              context.photos = [];
              context.videos = [];

              m.sendText(userid, context.__("First, can you send me photos or videos of the issue you found?"));

              resolve();
            }, 1000);
          }));

        } else if (postback === PAYLOAD_CONTACT_US) {
          context.lastSent = (new Date()).getTime();
          context.state = STATE_DISABLED;

          m.sendText(userid, context.__("You can leave us messages, and our staff will get back to you as soon as possible."));

        } else {
          m.sendText(userid, context.__("Slow down, could you please answer my question first?") );
        }
      } else if (context.state === STATE_WAIT_IMG) {
        if (attachments) {
          if (!isSticker && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
            context.lastSent = (new Date()).getTime();

            m.sendText(userid, context.__('(Y) Sweet!') );

            await (addPhotos(attachments, context));
            await (new Promise( (resolve,reject) => {
              setTimeout(() => {
                context.lastSent = (new Date()).getTime();
                context.state = STATE_WAIT_LOCATION;

                m.sendText( userid, context.__("Next, can you help us locate the issue by sharing the location using Facebook Messenger App on your mobile phone?") );

                resolve();
              }, 1000);
            }));
          } else {
              m.sendText( userid, context.__("Just photos or videos please. I'm getting confused! 😓") );
          }
        } else {
          m.sendText(userid, context.__("Hurry up, I'm still waiting for photos or videos.") );
        }
      } else if (context.state === STATE_WAIT_LOCATION) {
        if (attachments && attachments[0].type == 'location') {
          context.lastSent = (new Date()).getTime();

          m.sendText(userid, context.__("🚩 Ahh, got it.") );

          const point = attachments[0].payload.coordinates;
          context.location = [point.lat, point.long];
          await (new Promise( (resolve,reject) => {
            setTimeout(() => {
              context.lastSent = (new Date()).getTime();
              context.state = STATE_WAIT_DESC;
              context.hashtags = [];

              m.sendText(userid, context.__("Alright, can you explain the issue you'd like to report today? Please make it as detailed as possible."));

              resolve();
            }, 1000);
          }));
        } else if (!isSticker && attachments && attachments.length > 0 && (attachments[0].type == 'image' || attachments[0].type == 'video')) {
          // Add photos/videos
          context.lastSent = (new Date()).getTime();
            m.sendText(userid, context.__("(Y) Cool! Don't forget to send me the location.") );
          await (addPhotos(attachments, context));
        } else {
          m.sendText(userid, context.__("Let us know the location so that the responsible agency can take care of the problem quickly.") );
        }
      } else if (context.state === STATE_WAIT_DESC) {
        if (messageText) {
          const isEnding = processText(messageText, context);

          if (isEnding) {
            if (context.descLength < 10) {
              context.lastSent = (new Date()).getTime();
              m.sendText( userid, context.__("Provide us a little more detail please.") );
            } else {
              context.state = STATE_WAIT_TAGS;
              context.categories = [];
              m.sendTextWithReplies(userid, context.__("Could you please help me select appropriate categories for the issue? You can pick one from the list below or type #<category> for a custom category."),
                tagReplies(context).slice(1)
              );
            }
          } else {
            if (context.desc.length == 1) {
              // After 1st response
              context.lastSent = (new Date()).getTime();
              m.sendTextWithReplies(
                userid,
                context.__("You can keep on typing! Send '#done' when you finish so that we can proceed to the next step."),
                _.take(tagReplies(context),1)
              );
            } else if (context.descLength > 140) {
              context.lastSent = (new Date()).getTime();
              m.sendTextWithReplies(
                userid,
                context.__("Done? If not, don't worry, I'm still listening."),
                _.take(tagReplies(context),1)
              );
            }
          }
        } else if (!isSticker && attachments) {
          if (attachments[0].type == 'image' || attachments[0].type == 'video') {
            // Add photos/videos
            context.lastSent = (new Date()).getTime();
            m.sendText( userid, context.__("The photos/videos have been added.") );
            addPhotos(attachments, context);
          } else if (attachments[0].type == 'location') {
            context.lastSent = (new Date()).getTime();
            m.sendText( userid, context.__("🚩 The location has been updated.") );
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

              m.sendText( userid, context.__("Thank you very much, {{name}}. Please follow the link below to verify yourself and submit the report. We will notify the responsible agency as soon as possible.", { name : context.profile.first_name } ) );

              const desc = context.desc.join(' ');
              let res = await ( new Promise( (resolve,reject) => {
                  api.postPin(
                    {
                      categories: context.categories,
                      created_time: (new Date()).getTime(),
                      detail: desc,
                      location: {
                        coordinates: context.location
                      },
                      owner: apiUserId,
                      photos: context.photos,
                      provider: apiUserId,
                      status: 'unverified',
                      tags: context.hashtags
                    },
                    resolve
                  );
              }));
              const pinId = res._id
              const elements = [{
                title: 'ยุพิน | YouPin',
                subtitle: desc,
                item_url: `http://youpin.city/pins/${pinId}`,
                image_url: context.photos[0]
              }]
              m.sendGeneric(userid, elements);
              context = {};
              await (conversation.updateContext(userid, context));
          } else {
            context.lastSent = (new Date()).getTime();
            m.sendTextWithReplies(userid, context.__("Anything else? You can keep adding more tags.") , tagReplies(context) );
          }
        }
      }

      await (conversation.updateContext(userid, context));
      console.log("-- Saved context --");
      console.log(context);
    })
  };
};
