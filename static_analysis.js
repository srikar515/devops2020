const Octokit = require('@octokit/rest');
var CLIEngine = require('eslint').CLIEngine;
var request = require('request');

var displayIdle = require('./displayIdle');
var oled = new (require('./OLED')).oled(0x3C);
var esconfig = require('./static_config.json');
var config = require('./config/config.json');
var cli = new CLIEngine(esconfig);
var token = require(config.tokenPath);

var accessToken = token.accessToken;


const octokit = new Octokit ({ 
	auth: {
		username: config.gituser,
		password: config.gitpass
	}
});

function isJSFile(file){
	if((file.filename).lastIndexOf('.js') >= (file.filename).length - 3){
		return true;
	}
	else
		return false;
}

function isFileAdded(file){
	if(file.status == "added")
		return true;
	else
		return false;
}

function isFileModified(file){
	if(file.status == "modified")
		return true;
	else
		return false;
}

function postScanResultsCallback(error, response, body) {
	if(error) {
		console.log("Failed to post Scan results to ServiceNow : " + error);
      	return;
	} 
	console.log("Successfully posted Scan Results to ServiceNow.");
}

function postScanResults(finalResults, head, scan_id){
	console.log("Posting Scan Results to ServiceNow ...");
	var finalResultObj = {
		branch : head,
		scanid : scan_id,
		finalResult : finalResults
	};
	console.log(finalResults);
	var captureScanResultURL = config.url + "/api/x_snc_devops_iot/get_static_analysis_report_from_device/capture"; 
	var options = {
		url: captureScanResultURL,
		method: 'POST',
		headers: {
			"Accept":"application/json",
		    	"Content-Type":"application/json",
		    	"Authorization": ("Bearer " + accessToken)
		},
		json: true,
		body: finalResultObj
	};
	
	// Posting results to ServiceNow
	request(options, postScanResultsCallback);
} 

function codeCheck(code, path, finalResults){
	//Doing Static Code Analysis of the code in the file present 
	var report = cli.executeOnText(code, path);
	
	var fileResults = {
		name: path,
		data: report.results
	};
	finalResults.push(fileResults);
}

async function analyzeCommit(scan_id, owner, repo, base, head, ref, finalResults){
	// comparing branch and master repository to see modifications done in the branch
	
	const result = await octokit.repos.compareCommits({owner, repo, base, head});
	oled.writeString(56, 48, 1, "0%", 1);	
	for(var i in result['data']['files']){
		var file = result['data']['files'][i];
		// Among the modifications only files that are added or modified needs to be analyzed.
		
		if(isJSFile(file) == true && (isFileAdded(file) || isFileModified(file))){
			var path = file.filename;
			
			// getting contents of the files that are changed. Note they are in Base 64 form.
			var content = await octokit.repos.getContents({owner, repo, path, ref});  
			var buf = new Buffer(content['data'].content, 'base64');
			var code = buf.toString();
			
			// checking code for errors
			codeCheck(code, path, finalResults);
		}
	}
	oled.writeString(56, 48, 1, "50%", 1);
	console.log("Scan Completed.");
	postScanResults(finalResults, head, scan_id);
	
	oled.init();
	oled.writeString(24, 24, 1, "scan completed.", 1);
	oled.writeString(56, 48, 1, "100%", 1);
	setTimeout(function (){
		displayIdle.setIdle(true);
	}, 3000);
}

module.exports.commitAnalyse = analyzeCommit;
