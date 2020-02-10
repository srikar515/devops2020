var getmac = require('getmac');
var request = require('request');

var oauth = require('./oauth');
var oled = new (require('./OLED')).oled(0x3C);
var displayIdle = require('./displayIdle');

var args = process.argv.slice(2);
oled.init();
oled.writeString(36, 24, 2, "hello", 1);

var pollingInterval = 5000;
var previousPollingTime = new Date();
var currentPollingTime = new Date();

if(args.length > 0) {
	// Get Oauth Token
	oauth.oauth(args[0], args[1]);	
} else {
	// Assumes OAuth token is already present
	
	// Following are selectively loaded as they need OAuth token to be present 
	var staticAnalyse = require('./static_analysis');
	var testing = require('./testing');
	var reg = require('./registration');
	var ota = require('./ota_updates');
	var config = require('./config/config.json');
	var token = require(config.tokenPath);

	setTimeout(function (){
    		displayIdle.displayIdle();
	},1000);

	var mac;
 
	reg.reg();

	var accessToken = token.accessToken;

	function callback(error, response, body) {
		previousPollingTime = currentPollingTime;
		currentPollingTime = new Date();
		var timeInterval = (currentPollingTime - previousPollingTime);
		if(error) { 
			console.log("Polling failed with error: " + error);
			console.log("Last call was " + timeInterval + " ms ago.");
			return;
		}
		
		var resp;
		if(response.body.result){
			resp = response.body.result.payload;
		}
		console.log('Polling successful. Last call was ' + timeInterval + " ms ago.");
		if(resp) {
			var resObj = JSON.parse(resp);
			var inputType = resObj.type;
			var input = resObj.input;
			
			switch(inputType){
				case "scan" : 
									
					console.log('Scan started.');
					displayIdle.setIdle(false);
					oled.init();
					oled.writeString(28, 24, 1, "Scan Started", 1);
					var finalResults = [];
					var owner = input.owner;
					var repo = input.repo;
					var scan_id = input.scanid;
					var base = input.master;
					var head = input.current;
					var ref = input.current;
					staticAnalyse.commitAnalyse(scan_id, owner, repo, base, head, ref, finalResults);
					break;
			
				case "test" :
				
					console.log('Test started.');
					displayIdle.setIdle(false);
					oled.init();
					oled.writeString(28, 24, 1, "Test Started", 1);
					var user = input.user;
					var repository = input.repo;
					var repo_owner= input.owner;
					var branch = input.branch;
					var scanId = input.scanid;
					testing.testAnalysis(user, repo_owner, repository, branch, scanId);
					break;
					
				case "ota" : 
					console.log('ota started');
					displayIdle.setIdle(false);
					clearInterval(pollingInterval);
					oled.init();
					oled.writeString(30, 24, 1, "OTA Started", 1);
					var scanid = input.scanid;
					ota.ota(scanid);
					break;
				default :
					console.log("Invalid Type");
			}
		}
	}

	function polling(){
		var object = {
			macAddress : mac
		};
		var Url = config.url + "/api/x_snc_devops_iot/send_data_to_device/send";
		var options = {
			url: Url,
			method: 'GET',
			headers: {"Accept":"application/json",
			    	"Content-Type":"application/json",
				"Authorization": ("Bearer " + accessToken)
			},
			json: true,
			qs: object
		};
		request(options, callback);
	}
	
	getmac.getMac(function(err, macAddress){
		mac = macAddress;
		currentPollingTime = new Date();
		pollingInterval = setInterval(polling, pollingInterval);
	});
}




