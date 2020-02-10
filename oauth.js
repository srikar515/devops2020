var OAuth = require('oauth');
var OAuth2 = OAuth.OAuth2;
const fs = require('fs');
var config = require('./config/config.json');

function oauthCallback(e, access_token, refresh_token, results){
	var tokenRawData = fs.readFileSync(config.tokenPath);
	var token = JSON.parse(tokenRawData);
	token.accessToken = access_token;
	token.refreshToken = refresh_token;
	var tokenString = JSON.stringify(token,null,2);  
	fs.writeFile(config.tokenPath, tokenString, function (err){
		if (err) {
			console.log("Unable to save token. Error: " + err);
			return;
		}
		console.log("token saved");
	});
	fs.writeFile("./oauth/access_token.txt",access_token, function(err) {
           	if(err) {
               		return console.log(err);
		}

           	console.log("Access token was saved!");
	});
	fs.writeFile("./oauth/refresh_token.txt",refresh_token, function(err) {
	        if(err) {
	               return console.log(err);
		}

		console.log("Refresh token was saved!");
	});
}

function oauth(username, password){
	var clientid = config.clientid;
	var clientSecret= config.clientSecret;
	var oauth2 = new OAuth2(clientid, clientSecret, config.url+"/",  null, 'oauth_token.do', null);
	oauth2.getOAuthAccessToken('', {
		'grant_type':'password',
		'username': username,
		'password': password
	}, oauthCallback);
}

module.exports.oauth = oauth;
