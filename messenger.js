const request = require('request');

module.exports = (PAGE_ACCESS_TOKEN) => {

  function _callSendAPI(messageData) {
    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData,
        headers: {'Content-Type': 'application/json'},
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
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
    sendImage: function(userid, url) {
      const messageData = {
        recipient: {
          id: userid
        },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: url
            }
          }
        }
      };

      _callSendAPI(messageData);
    },

    sendText: function(userid, text) {
      const messageData = {
        recipient: {
          id: userid
        },
        message: {
          text: text
        }
      };
      _callSendAPI(messageData);
    },

    sendButton: function(userid, text, buttons) {
      const messageData = {
        recipient: {
          id: userid
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: text,
              buttons: buttons
            }
          }
        }
      };

      _callSendAPI(messageData);
    },

    sendGeneric: function(userid, elements) {
      const messageData = {
        recipient: {
          id: userid
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements
            }
          }
        }
      };

      _callSendAPI(messageData);
    },

    getProfile: function(userid, callback) {
      request(
        {
          uri: 'https://graph.facebook.com/v2.6/' + userid,
          qs: {
            fields: 'first_name,last_name,profile_pic,locale,timezone,gender',
            access_token: PAGE_ACCESS_TOKEN
          },
          method: 'GET',
          json: true
        },
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            callback(body);
          } else {
            console.error('Unable to get user profile.');
            console.error(response);
            console.error(error);
          }
        }
      );
    }
  };

};
