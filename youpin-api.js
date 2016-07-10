const request = require('request');

module.exports = (uri) => {
  return {
    postPin: function(json, callback) {
      request(
        {
          uri: uri + '/pins',
          method: 'POST',
          json: json,
          headers: {'Content-Type': 'application/json'}
        },
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            callback(body);
          } else {
            console.error('Unable to post a new pin.');
            console.error(response);
            console.error(error);
          }
        }
      );
    },

    uploadPhotoFromURL: function(imgLink, callback) {
      request(
        {
          uri: uri + '/photos/uploadfromurl',
          method: 'POST',
          json: imgLink,
          headers: {'Content-Type': 'application/json'}
        },
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            callback(body);
          } else {
            console.error('Unable to upload an image.');
            console.error(response);
            console.error(error);
          }
        }
      );
    }
  };
};
