/*
  For running this for the first time, 
  comment the code send_message_from_bot(message)
  in function get_new_submissions()

  this will only update the google sheet for the first time.

  this is done because first time you will get approx MAX_SUBMISSIONS*NUM_OF_FRIENDS submissions,
  which will reach api limit of telegram bot.

  now uncomment, and keep running it every hour(using a trigger),
  you will not reach api requests limit of telegram bot
*/

function main()
{
  add_new_submissions();
}

function environment()
{

  return {
    TOT_CHARS : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    CF_API_KEY : "**REMOVED**",
    CF_API_SECRET : "",
    RAND_STR_LEN : 6,
    MAX_SUBMISSIONS:100,
    SPREADSHEET_ID : "**REMOVED**",
    RANGE_NAME : 'Sheet1!A1:A',
    TELEGRAM_BOT_SECRET :'**REMOVED**',
    TELEGRAM_CHAT_ID_WITH_ME : '**REMOVED**'
  };
}

function SHA512(s) {
  var hexstr = '';
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, s);
  for (i = 0; i < digest.length; i++) {
    var val = (digest[i]+256) % 256;
    hexstr += ('0'+val.toString(16)).slice(-2);
  }
  return hexstr;
}

function randString(randStrLen) 
{
  var randStr = "";
  var tot_chars = environment().TOT_CHARS;
    
  for (var i=0; i < randStrLen; i++) 
  {
    randStr += tot_chars.charAt(Math.floor(Math.random()*tot_chars.length)); 
  }

  return randStr;
}

function get_friends_list() {

  Logger.log("Fetching friend's list from codeforces api.");

  var randStr = randString(environment().RAND_STR_LEN);

  var today = new Date();
  var today_in_unix_string = Math.floor((today.getTime()/1000)).toString();

  var to_be_hashed = randStr+"/user.friends?apiKey="+environment().CF_API_KEY+"&time="+today_in_unix_string+"#"+environment().CF_API_SECRET;
  var hash = SHA512(to_be_hashed);

  var url="https://codeforces.com/api/user.friends?apiKey="+environment().CF_API_KEY+"&time="+today_in_unix_string+"&apiSig="+randStr+hash;

  friends_list=[]

  try{
    var response = UrlFetchApp.fetch(url);
    response = JSON.parse(response);
    friends_list=response["result"];
    
  }catch(e)
  {
    console.log("Error in [get_friends_list]");
  }
  
  Logger.log("Fetched ["+friends_list.length+"] friends  from codeforces api.");
  return friends_list;
}

function get_submissions_from_cf_api()
{

  Logger.log("Fetching submissions from codeforces api.");

  var friends_list=get_friends_list();


  var list_of_submissions =[];

  

    try{
      for(var i=0;i<friends_list.length;i++)
      {
        var url = "https://codeforces.com/api/user.status?handle="+friends_list[i]+"&from=1&count="+environment().MAX_SUBMISSIONS;
        var response = UrlFetchApp.fetch(url);
        response = JSON.parse(response);

        response = response["result"];

        for(var j=0;j<response.length;j++)
        {
          var submission = {};
          submission["author"] = friends_list[i];

          submission["id"] = response[j]["id"].toString();

          submission["verdict"] = response[j]["verdict"].toString();

          submission["name"] = response[j]["problem"]["index"].toString()+" - "+response[j]["problem"]["name"].toString();
          submission["url"] = "codeforces.com/contest/"+response[j]["contestId"].toString()+"/submission/"+response[j]["id"].toString();

          submission["tags"] = response[j]["problem"]["tags"].toString();
          submission["tags"] = submission["tags"].replace(/,/g,', '); // replace all ',' with ', '

          submission["contestId"]="";
          if(response[j]["contestId"]!=undefined)
          {
            submission["contestId"] = response[j]["contestId"].toString();
          }


          submission["rating"] = "Rating = ";
          if(response[j]["problem"]["rating"]!=undefined)
          {
            submission["rating"] += response[j]["problem"]["rating"].toString();
          }

          submission["submissionTime"] = Utilities.formatDate(new Date(response[j]["creationTimeSeconds"]*1000), "GMT+5:30", "HH:mm | dd/MM/yyyy").toString();

          list_of_submissions.push(submission);
        }
      }

    }catch(e)
    {
      console.error("Error in [get_submissions_from_cf_api]");
    }
    

    
  

  Logger.log("Fetched ["+list_of_submissions.length+"] submissions from codeforces api.");
  return list_of_submissions;

}

function get_submissions_in_spreadsheets()
{

  Logger.log("Fetching submissions already present in the spreadshhet.");

  var values = Sheets.Spreadsheets.Values.get(environment().SPREADSHEET_ID, environment().RANGE_NAME).values;

  if(values==null)
  {
    values =[[]];

  }

  var submissions_in_spreadsheet = [];

  for(var i=0;i<values.length;i++)
  {
    if(values[i].length>0)
    {
      submissions_in_spreadsheet.push(values[i][0]);
    }
  }

  Logger.log("Fetched ["+submissions_in_spreadsheet.length+"] submissions from spreadshhet.");
  return submissions_in_spreadsheet;
}


function get_new_submissions()
{
  Logger.log("Fetching new submissions.");

  submissions_in_spreadsheet = get_submissions_in_spreadsheets();
  submissions_from_api = get_submissions_from_cf_api();

  var to_be_added = [];

  for(var i=0;i<submissions_from_api.length;i++)
  {
    if(submissions_in_spreadsheet.indexOf(submissions_from_api[i]["id"])==-1)
    {
      to_be_added.push([submissions_from_api[i]["id"]]);

      var message = get_uri_encoded_string(submissions_from_api[i]);

      send_message_from_bot(message);
    }
  }

  Logger.log("Fetched ["+to_be_added.length+"] new submissions.");
  return to_be_added;
}

function add_new_submissions()
{
  Logger.log("Adding new submissions in Google Sheets.");

  var valueRange = Sheets.newRowData();
  valueRange.values = get_new_submissions();

  var appendRequest = Sheets.newAppendCellsRequest();
  appendRequest.sheetId = environment().SPREADSHEET_ID;
  appendRequest.rows = [valueRange];

  var result = Sheets.Spreadsheets.Values.append(valueRange, environment().SPREADSHEET_ID, environment().RANGE_NAME, {valueInputOption: "USER_ENTERED"});
  var num=0;
  if(result["updates"]["updatedCells"]!=undefined)
  {
    num=result["updates"]["updatedCells"];
  }
  Logger.log("Added ["+num+"] new submissions in Google Sheets");
}


function get_uri_encoded_string(submission)
{
  var message="";
  message+=encodeURIComponent("<b>"+submission["author"]+"</b>");
  message+=encodeURIComponent("\n");
  message+=encodeURIComponent(submission["submissionTime"]);
  message+=encodeURIComponent("\n");
  message+=encodeURIComponent("\n");
  message+=encodeURIComponent(submission["verdict"]);
  message+=encodeURIComponent("\n");
  message+="%3Ca+href%3D%22https%3A%2F%2F"+submission["url"]+"%2F%22%3E"+submission["name"]+"%3C%2Fa%3E";
  message+=encodeURIComponent("\n");
  message+=encodeURIComponent(submission["rating"]);
  message+=encodeURIComponent("\n");
  message+=encodeURIComponent("[ "+submission["tags"]+" ]");

  return message;      
}

function send_message_from_bot(message)
{
  // message = message.replace(/_/g,'\_');
  
    var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + environment().TELEGRAM_BOT_SECRET + "/sendMessage?text=" + message + "&chat_id=" + environment().  TELEGRAM_CHAT_ID_WITH_ME+"&parse_mode=HTML&disable_web_page_preview=true");
  response=JSON.parse(response);

    if(response["ok"]==true)
    {
      Logger.log("Message ["+response["result"]["text"]+"] sent to "+response["result"]["chat"]["username"]);
    }
    else
    {
      Logger.log("Error in sending message from telegram bot. Message was : ");
      Logger.log(message);
    }
  
}


