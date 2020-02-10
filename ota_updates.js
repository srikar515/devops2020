var exec = require('child_process').exec; 
var config = require('./config/config.json');
var mac = require('getmac');
var request = require('request');

var oled = new (require('./OLED')).oled(0x3C);
var token = require(config.tokenPath);
var accessToken = token.accessToken;

//function to check if any error came while running cli commands
function isError(stderr){
	var list = stderr.split('\n');
	for(var i in list){
		var words = list[i].split(' ');
		for(var j in words){
			if(words[j] == 'ERR!' || words[j] == 'error:')
				return  true;
		}
	}
	return false;
}

function postOTAErrorsCallback(error, response, body) {
	if(error) {
		console.log("Posting to ServiceNow failed : " + error);
		return;
	} 
	console.log("OTA errors sucessfully posted to ServiceNow");
}


function postOTAErrors(scan_id, stderr){
	console.log("Posting errors during OTA updates to ServiceNow ... ");
	mac.getMac(function (err, macAddress){
		var finalResultObj = {
			scanid : scan_id,
			stderr : stderr,
			mac : macAddress
		};

		var postOTAErrorsURL = config.url + "/api/x_snc_devops_iot/get_ota_errors_from_device/capture";
		var options = {
			url: postOTAErrorsURL,
			method: 'POST',
			headers: {"Accept":"application/json",
				"Content-Type":"application/json",
				"Authorization": ("Bearer " + accessToken)
		    	},
			json: true,
			body: finalResultObj
		};
		console.log(finalResultObj);
		request(options, postOTAErrorsCallback);
	});
	oled.init();
	console.log("OTA update failed.");
	oled.writeString(24, 24, 1, "OTA Failed", 1);
}

function deleteBackupCallback(error, stdout, stderr){
	if(error){
		console.log('Error in removing backup: ' + error);
		return;
	}
	else if(stderr){
		console.log('Error in removing backup: ' + stderr);
		return;
	}
	console.log("Backup removed successfully.");
}

//function to delete the backup after successful update
function deleteBackup(){
	var delRepoCommand = 'rm -Rf ./../backup/*';
	console.log("Removing Backup ...");
	exec(delRepoCommand, function (error, stdout, stderr){
		deleteBackupCallback(error, stdout, stderr);
	});
}

function restoreCallback(scan_id, error, stdout, stderr){
	if(error){
		postOTAErrors(scan_id, error);
		return;
	} else if (isError(stderr) == false){
		console.log("Program restored to previous version.");
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		deleteBackup();
	} else {
		console.log("Errors while restoring the program : " + stderr);
	}
}

function restore(scan_id){
	var restoreCommand = 'cp -a ./../backup/* ' + process.cwd();
	console.log("Restoring from Backup...");
	exec(restoreCommand, function(error, stdout, stderr){
		restoreCallback(scan_id, error, stdout, stderr);
	});
}

function rollbackCallback(scan_id, error, stdout, stderr){
	if(error){
		console.log("Error during rollback : " + error);
		postOTAErrors(scan_id,error);
		return;
	}
	console.log('Error during rollback : ' + stderr);
	restore(scan_id);
}

//function to rollback the update in case of unsuccessful update
function rollback(scan_id){
	console.log("Rollbacking to previous version ...");
// 	var delUpdateComm = 'rm -Rf ./*';
// 	exec(delUpdateComm, function (error, stdout, stderr){
// 		rollbackCallback(scan_id, error, stdout, stderr);
// 	});
	restore(scan_id);
}

function installDependenciesCallback(scan_id, error, stdout, stderr){
	if (error){
		console.log("Dependencies installation failed : " + error);
		postOTAErrors(scan_id, error);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
		return;
	}
	else if(isError(stderr)==false) {
		console.log("Dependencies installed Successfully.");
// 		deleteBackup();
		
		oled.writeString(24, 24, 1, "OTA Completed", 1);
		oled.writeString(56, 48, 1, "100%", 1);
		
		setTimeout(function(){
			oled.init();
			oled.writeString(30, 24, 1, "Restarting", 1);          	
			console.log("Update Completed Successfully.");
			setTimeout(function(){
				process.exit();
			},1000);
		},5000);
		return;
	} else {
		console.log("Dependencies installation failed : " + stderr);
		postOTAErrors(scan_id, stderr);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
	}
}


// function to install dependencies
function installDependencies(scan_id){
	console.log("Checking and installing new dependencies ... ");
	var npmCommand = 'npm install --unsafe-perm';
	exec(npmCommand, function (error, stdout, stderr) {
		installDependenciesCallback(scan_id, error, stdout, stderr);
	});
}


function updatePullCallback(scan_id, error, stdout, stderr){
	if(error){
		console.log('Pulling updated failed : ' + error);
		postOTAErrors(scan_id, error);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
		return;
	}
	else if(isError(stderr)==false){
		console.log('Successfully pulled update from Github');
		oled.writeString(56, 48, 1, "60%", 1);
		installDependencies(scan_id);
		return;
	} else {
		console.log('Pulling updated failed : ' + stderr);
		postOTAErrors(scan_id, stderr);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
	}
}

// function to pull updates from github repo
function updatePull(scan_id){
	var gitPullCommand = 'git pull';
	console.log("Pulling updates from Github ...");
	exec(gitPullCommand,function (error, stdout, stderr){
		updatePullCallback(scan_id, error, stdout, stderr);
	});
}

// function to update the running program
function updateStashCallback(scan_id, error, stdout, stderr){
	if(error){
		console.log("Git Stash error : " + error);
		postOTAErrors(scan_id, error);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
// 		deleteBackup();
		return;
	}
	else if(isError(stderr)==false){
		updatePull(scan_id);
		oled.writeString(56, 48, 1, "40%", 1);
		return;
	} else {
		console.log("Git Stash error : " + stderr);
		postOTAErrors(scan_id, stderr);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		rollback(scan_id);
// 		deleteBackup();
	}
}

function updateStash(scan_id){
	var gitStash = "git stash";
	exec(gitStash,function (error, stdout, stderr){
		updateStashCallback(scan_id, error, stdout, stderr);	
	});
}

function otaCallback(scan_id, error, stdout, stderr){
	if(error){
		console.log('Creating backup failed : ' + error );
		postOTAErrors(scan_id, stderr);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		deleteBackup();
		return;
	}
	else if(isError(stderr)==false){
		console.log("Backup created Successfully.");
		oled.writeString(56, 48, 1, "20%", 1);
		updateStash(scan_id);
		return;
	} else {
		console.log('Error while creating Backup : ' + stderr);
		postOTAErrors(scan_id, stderr);
		setTimeout(function (){
      			oled.init();
      			oled.writeString(30, 24, 1, "Restarting", 1);
			setTimeout(function(){
				process.exit();
			},5000);
		},5000);
// 		deleteBackup();
	}
}

function ota(scan_id){
	var copyCommand = 'cp -a '+process.cwd() + '/* ./../backup';
	oled.writeString(56, 48, 1, "0%", 1);
	console.log("Creating backup ...");
	exec(copyCommand,function (error, stdout, stderr){
		otaCallback(scan_id, error, stdout, stderr);
	});
}

module.exports.ota = ota;
