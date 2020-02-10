
var mac = require('getmac');
var request = require('request');
var fs = require('fs');
var config = require('./config/config.json');
var token = require(config.tokenPath);

var accessToken = token.accessToken;

function callback(error, response, body) {
	if(error) {
		console.log("Device Registration Failed : " + error);
		return;
	} 
	console.log("Device Registration successful");
}

module.exports.reg = function reg(){
	mac.getMac(function (err, macAddress){
		if (err)  throw err;
		console.log("MAC Address : " + macAddress);
		var rawdata = fs.readFileSync('package.json');
		var pack = JSON.parse(rawdata);
		var object = {
			'mac' : macAddress,
			'version' :  pack.version
		};
		if(accessToken){
			console.log("Access Token is present.");
		} else {
			console.log("Access Token not found.");
			console.log("Please run the program with credentials to save OAuth tokens");
			console.log("Program will exit.");
			process.exit();
		};
			    
		var Url = config.url + "/api/x_snc_devops_iot/device_registration/capture";
		var opt = {
			url: Url,
			method: 'POST',
			headers: {"Accept":"application/json",
				"Content-Type":"application/json",
				"Authorization": ("Bearer " + accessToken)
			},
			json: true,
			body: object
		};
		console.log("firmware version : " + pack.version);
		console.log("Device Registering itself ...");
		request(opt, callback);
	});
};
