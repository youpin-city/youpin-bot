// TO-DO: Switch to a proper data storage (Redis?)

module.exports = (sessionMaxLength) => {
  return {
    _conversations: {},

    getContext: function(userid) {
      if (this._conversations[userid]) {
        if ((new Date()).getTime() - this._conversations[userid].lastReceived <
          sessionMaxLength
        ) {
          return this._conversations[userid];
        } else {
          // TO-DO: If there is a stale, incomplete session, follow up first.
          console.log('Previous session discarded: ' + this._conversations[userid]);
        }
      }

      return { state: 'new' };
    },

    updateContext: function(userid, context) {
      this._conversations[userid] = context;
    }
  };
};
