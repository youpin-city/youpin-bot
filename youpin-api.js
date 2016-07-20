'use strict';

const request = require('superagent');

const feathers = require('feathers/client');
const rest = require('feathers-rest/client');
const hooks = require('feathers-hooks');
const authentication = require('feathers-authentication/client');

class Api {
  // initialise api and do authentication
  constructor(uri, username, password) {
    this.uri = uri;
    this.token;
    this.username = username;
    this.password = password;
    const app = feathers()
      .configure(hooks())
      .configure(rest(uri).superagent(request))
      .configure(authentication());
    return new Promise(resolve => {
      app.authenticate({
        type: 'local',
        'email': username,
        'password': password
      }).then(result => {
        this.token = app.get('token');
        resolve(this);
      }).catch(error => {
        console.log(error);
      });
    });
  }

  postPin(json, callback) {
    request
      .post(this.uri + '/pins')
      .set('Authorization', 'Bearer ' + this.token)
      .send(json)
      .end(function (error, response) {
        if (!error && response.ok) {
          callback(response.body);
        } else {
          console.error('Unable to post a new pin.');
          console.error(response);
          console.error(error);
        }
      });
  }

  uploadPhotoFromURL(imgLink, callback) {
    const json = {
      url: imgLink
    };

    request
      .post(this.uri + '/photos/upload_from_url')
      .send(json)
      .end(function (error, response) {
        if (!error && response.ok) {
          callback(response.body);
        } else {
          console.error('Unable to upload a new photo.');
          console.error(response);
          console.error(error);
        }
      });
  }
};

module.exports = Api;
