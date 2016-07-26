# YouPin Chat Bot

### Setting up your FB Messenger Bot
You can follow the instructions provided here: https://developers.facebook.com/docs/messenger-platform/quickstart.  
- [YouPin App](https://developers.facebook.com/apps/1590826994566376), linked to the official [YouPin Page](www.facebook.com/youpin.city)
- [YouPin Test App](https://developers.facebook.com/apps/266788757017683) (for development/testing), linked to the [YouPin Test Page](https://www.facebook.com/youpin.city.test)

If you fork this repo for other applications, you will need to create a new Facebook App and/or Page first.

Here are some gotchas you might run into:
- You might want to do Step 3 before Step 2.
- Make sure you include App Secret, Page Access Token, and Validation Token in a config file (such as `production.json`) in the config folder. 
- The validation token can be any string, but it has to match whatever you put in in Step 2. To successfully set up a webhook in Step 2, your service has to be online first! 

### youpin-api.js
This wrapper module provides functions for posting Pins and uploading photos using [youpin-api](https://github.com/youpin-city/youpin-api). See the repo for more info regarding the API. 

- [ ] Implement functions for other available API calls and share this module with [youpin-web](https://github.com/youpin-city/youpin-web).
- [ ] Implement more advanced functions involving the API, such as retrieving potential duplicated Pins ([#10](https://github.com/youpin-city/youpin-bot/issues/10)). (But maybe this should be done in the backend, so that the web counter part can also use it.)

### messenger.js 
This wrapper module provides commonly used functions for creating and sending messages via Facebook Messenger. 

### conversation.js
This module manages conversation context for each user, e.g., whether he or she has posted a photo. The current implementation is super hacky. We should switch to Redis for in-memory data storage ([#4](https://github.com/youpin-city/youpin-bot/issues/4)). 

### youpin.js
This module implements conversation logics for the bot. There are a lot of easy improvements we can potentially implement to make the bot appears smarter. 

- [ ] Use a proper framework to handle i18n strings ([#5](https://github.com/youpin-city/youpin-bot/issues/5))
- [ ] Report a problem (skip the menu/choices) if the first message is a photo ([#8](https://github.com/youpin-city/youpin-bot/issues/8)) 
- [ ] Create secret love from Auntie YouPin <3 ([#12](https://github.com/youpin-city/youpin-bot/issues/12))
