const redisConf = require('config').get('redis');
const Promise = require('bluebird');
const await = require('asyncawait/await');
const async = require('asyncawait/async');

const redis = require('redis');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const redisClient = redis.createClient(redisConf);

module.exports = (sessionMaxLength) => {
  return {
    sessionPrefix: 'youpin-user:',
    getContext: async (function(userid) {
      var context  = JSON.parse( await (redisClient.getAsync( this._buildKey(userid) )) )
      console.log("GET CONTEXT FROM STORE " + JSON.stringify(context) );
      return context || {};
    }),

    updateContext: async (function(userid, context) {
      var res = await (redisClient.setexAsync( [ this._buildKey(userid), sessionMaxLength , JSON.stringify(context) ]));
      console.log( 'Update context ' + userid + ' : ' + res );
    }),
    _buildKey: function(userid){
      return this.sessionPrefix + userid;
    }
  };
};
