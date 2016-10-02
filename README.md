![YouPin (ยุพิน)](https://raw.githubusercontent.com/youpin-city/youpin-web/master/public/image/logo.png)

# YouPin Chat Bot

### Setting up your FB Messenger Bot

To run FB Messenger Bot, it requires Facebook App and Facebook Page.

Our YouPin Bot uses the followings:
- [YouPin App](https://developers.facebook.com/apps/1590826994566376), linked to the official [YouPin Page](https://www.facebook.com/youpin.city)
- [YouPin Test App](https://developers.facebook.com/apps/266788757017683) (for development/testing), linked to the [YouPin Test Page](https://www.facebook.com/youpin.city.test)



If you fork this repo or try to run locally, you need to create a new Facebook App and/or Page first.

You can follow the instructions provided here: https://developers.facebook.com/docs/messenger-platform/quickstart. But you can skip step 2 (Webhooks), we will be back with Webhooks in the next section.

You should copy the App Secret and Page Access Token. We will use them in our config file.

### Run Bot in Local Environment
1. Clone this repo.

  `git clone https://github.com/youpin-city/youpin-bot.git`.

2. Install [docker](https://www.docker.com/).

3. Start API with MongoDB containers.

  `docker-compose up -d api`

4. Create a user account for your bot

  `curl -X POST localhost:9100/users -H 'Content-type: application/json' -d '{"name":"<your_name>","password":"<your_password>","email":"<your_email>","role":"user"}'`.

  It will return `_id` of your user.

  `<your_email>`, `<your_password>`, and `_id` will be used in step 6.

5. Make a copy of `config/default.json` and rename it to `config/development.json`.

6. Modify content of `config/development.json` with your created user account info and Facebook app/page secret.

    ``` javascript
    {
      "appSecret": "<your_facebook_app_secret>",
      "pageAccessToken": "<your_facebook_page_access_token>",
      "validationToken": "<whatever, it will be used later>",
      "sessionMaxLength": 600000,
      "apiUri": "http://api:9100",
      "apiUsername": "<your_email>",
      "apiPassword": "<your_password>",
      "apiUserId": "<_id>"
    }
    ```

7. Start the bot container.

  `docker-compose up -d bot`

8. Install ngrok to help Facebook connect to localhost

  `npm install -g ngrok`

9. Start ngrok for tunneling.

  `ngrok http 5100`

  It will print

  ``` bash
  Tunnel Status online
  Update update available (version 2.1.3, Ctrl-U to update)
  Version           2.1.1
  Region            United States (us)
  Web Interface     http://127.0.0.1:4040
  Forwarding        http://<id>.ngrok.io -> localhost:5100
  Forwarding        https://<id>.ngrok.io -> localhost:5100
  Connections       ttl     opn     rt1     rt5     p50     p90
                     0       0       0.00    0.00    0.00    0.00
  ```

  Copy your `https://<id>.ngrok.io` to tell Facebook to connect. (Must be `https` not just `http`).

10. Go to your created Facebook app. Under `Products` section, `+Add Product` and choose `Webhooks`.

  Enter your `https://<id>.ngrok.io/webhook` into `Callback URL`.

  Enter your `validationToken` in Step 6. into `Verify token`.

  Select `message_deliveries`, `messages`, `messaging_optins`, and `messaging_postbacks`.

  Click `Verify and save`. The window will be closed automatically.

  Note: If the verfication fails, it be might caused by

      1) validationToken is not matched.

      2) ngrok does not start.

      3) API docker container fails to start.

11. Let's say hello to your bot in your created Facebook page. Enjoy!

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

The flow diagram of the bot can be found here: [raw](https://drive.google.com/file/d/0B0seIkVGhqYCMkhBeEZEX3dSSGM/view?usp=sharing), [pdf](https://github.com/youpin-city/youpin-bot/blob/master/YouPin%20Chatbot.pdf) 

## Update localizations
When adding new sentence, one should run `npm run i18n` to add the new senctences the localized files in `./locales`. Please make sure to install `dev` dependencies and be aware  that `node_modules` might affect `Docker` build.


- [ ] Report a problem (skip the menu/choices) if the first message is a photo ([#8](https://github.com/youpin-city/youpin-bot/issues/8))
- [ ] Create secret love from Auntie YouPin <3 ([#12](https://github.com/youpin-city/youpin-bot/issues/12))
