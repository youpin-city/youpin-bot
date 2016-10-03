const request = require('request');

module.exports = (PAGE_ACCESS_TOKEN) => {
  function _callSendAPI(messageData) {
    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData,
        headers: { 'Content-Type': 'application/json' },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          console.log('Successfully sent generic message ' +
            `with id ${body.message_id} to recipient ${body.recipient_id}`);
        } else {
          console.error('Unable to send message.');
          console.error(response);
          console.error(error);
        }
      }
    );
  }

  return {
    sendImage(userid, url) {
      const messageData = {
        recipient: {
          id: userid,
        },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url,
            },
          },
        },
      };

      _callSendAPI(messageData);
    },

    sendText(userid, text) {
      const messageData = {
        recipient: {
          id: userid,
        },
        message: {
          text,
        },
      };
      _callSendAPI(messageData);
    },

    sendTextWithReplies(userid, text, replies) {
      const messageData = {
        recipient: {
          id: userid,
        },
        message: {
          text,
          quick_replies: replies,
        },
      };
      _callSendAPI(messageData);
    },

    sendButton(userid, text, buttons) {
      const messageData = {
        recipient: {
          id: userid,
        },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons,
            },
          },
        },
      };

      _callSendAPI(messageData);
    },

    sendGeneric(userid, elements) {
      const messageData = {
        recipient: {
          id: userid,
        },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements,
            },
          },
        },
      };

      _callSendAPI(messageData);
    },

    getProfile(userid, callback) {
      request(
        {
          uri: `https://graph.facebook.com/v2.6/${userid}`,
          qs: {
            fields: 'first_name,last_name,profile_pic,locale,timezone,gender',
            access_token: PAGE_ACCESS_TOKEN,
          },
          method: 'GET',
          json: true,
        },
        (error, response, body) => {
          if (!error && response.statusCode === 200) {
            callback(body);
          } else {
            console.error('Unable to get user profile.');
            console.error(response);
            console.error(error);
          }
        }
      );
    },

    createPostbackButton(title, payload) {
      return {
        type: 'postback',
        title,
        payload,
      };
    },

    createQuickReplyButton(title, payload) {
      return {
        content_type: 'text',
        title,
        payload,
      };
    },
  };
};
