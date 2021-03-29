# cf-stalker-telegram-bot
##### _Bot which messages you for your codeforces friend's submissions_

### <ins>Steps</ins>
- copy paste the code given in Code.gs to a new script in https://script.google.com 
- add google sheets api from the services tab in your google app script
- add a time based trigger in your appscript of 1 hour, to run the script automatically every hour.
- get your codeforces `<api_key>` and `<api_secret>` from https://codeforces.com/settings/api
- create a google sheet and get its `<spreadsheet_id>`
- create a bot from botfather in telegram and get its `<api_token>`
- send any message to your created bot and get your chat id by going to https://api.telegram.org/bot<api_token>/getUpdates
