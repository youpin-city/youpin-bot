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

// api.postPin({
//   "created_time": "6/12/2016, 6:29 PM",
//   "detail": "หยุดบ่น ส่งพิน",
//   "owner": "00001",
//   "photos": ["photo1", "photo2"],
//   "status": "open",
//   "tags": ["ทางเท้า","น้ำท่วม"],
//   "updated_time": (new Date()).getTime(),
//   "location": [10.1, 10.2],
// },
//   (body) => {
//     const pinId = body.name;
//     console.log(pinId);
//   }
// );

// api.uploadPhotoFromURL(
//   'https://scontent.fbkk2-1.fna.fbcdn.net/v/t34.0-12/13618015_10154230431642570_236369585_n.jpg?oh=9028989917ffa8b26f3e82a283835d5a&oe=57820129',
//   (body) => {
//     console.log(body.url);
//   }
// );

