# YouPin Chat Bot

## Setting up your FB Messenger Bot
You can follow the instructions provided here: https://developers.facebook.com/docs/messenger-platform/quickstart.  
- [YouPin App](https://developers.facebook.com/apps/1590826994566376), linked to the official [YouPin Page](www.facebook.com/youpin.city)
- [YouPin Test App](https://developers.facebook.com/apps/266788757017683) (for development/testing), linked to the [YouPin Test Page](https://www.facebook.com/youpin.city.test)

If you fork this repo for other applications, you will need to create a new Facebook App and/or Page first.

Here are some gotchas you might run into:
- You might want to do Step 3 before Step 2.
- Make sure you include App Secret, Page Access Token, and Validation Token in a config file (such as `production.json`) in the config folder. 
- The validation token can be any string, but it has to match whatever you put in in Step 2. To successfully set up a webhook in Step 2, your service has to be online first! 

