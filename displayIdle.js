//import { clearInterval } from 'timers';

var oled = new (require('./OLED')).oled(0x3C);
var dht22 = new (require('./dht22')).dht22(20);
var request = require('request');
var customParams = require('./display');

var str = customParams.getStringToDisplay();
var isIdle = true ; 
var symbol = customParams.getStockSymbol();
var apikey = "ZIBKIR66UTH6AOY7";

var stockSymbol;
var stockPrice;

var stockHost = "https://www.alphavantage.co";
var stockUrl = "/query?function=BATCH_STOCK_QUOTES&symbols=" + symbol + "&apikey=" + apikey;

var stockPricesRequestOptions = {
	url: stockHost + stockUrl,
	method: 'GET',
	headers: {"Accept":"application/json",
		"Content-Type":"application/json"
	},
	json: true
};

// PDT = UTC-7 
var utcOffset = customParams.getUtcOffset();

function customDisplay(){
	if(isIdle){
		oled.clear();
		oled.writeString(12, 6, 2, str, 1);
	}
}

function getStockPricesCallback(error, response, body){
	if(error){
		console.log("error getting Stock prices : " + error);
		return;
	}
	if(response.body["Stock Quotes"]){
		var stockDetails = response.body["Stock Quotes"][0];
		if(stockDetails){
			stockSymbol = stockDetails['1. symbol'];
			stockPrice = stockDetails['2. price'];
			var timeStamp = stockDetails['4. timestamp'];
			if(isIdle){
				console.log(stockDetails);
			}
		} else {
			console.log("Error Fetching Stock Prices: Stock Prices not found. Check if Symbol is correct");
		}
	} else {
		console.log("Error Fetching Stock Prices.");
		console.log(response.body);
    	}
}

function getStockPrices(){
	console.log("Fetching Stock Prices of " + symbol);
	request(stockPricesRequestOptions, getStockPricesCallback);
	setInterval(function(){
		console.log("Fetching Stock Prices of " + symbol);
		request(stockPricesRequestOptions, getStockPricesCallback);
	},1200000);
}

function displayStockPrices(){
	if(isIdle){
		if(stockSymbol && stockPrice){
			console.log("Displaying Stock Prices Of " + symbol);
			oled.clear();
			oled.writeString(12, 6, 2, stockSymbol + " NYSE", 1);
			oled.writeString(12, 36, 2, stockPrice, 1);
		}	
	}
}

function displayClock() {
	if(isIdle){
		var d=new Date();
		var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
		var date  = new Date(utc + (3600000*(utcOffset)));
		var hour = date.getHours();
		hour = (hour < 10 ? "0" : "") + hour;
		var min  = date.getMinutes();
		min = (min < 10 ? "0" : "") + min;
		var sec  = date.getSeconds();
		sec = (sec < 10 ? "0" : "") + sec;
		oled.clear();
		var time = hour + ":" + min + ":" + sec;
		console.log("Time : " + time);
		oled.writeString(22, 25, 2, time, 1);
	}
}

function displayTemperatureHumidity(){
	if(isIdle){
		var temperature = dht22.getTemperature()+"F";
		var humidity = dht22.getHumidity() + "%";
		console.log("temperature : " + temperature);
		console.log("humidity : " + humidity);
		oled.clear();
		oled.writeString(12, 6, 2 , "T : " + temperature , 1);
		oled.writeString(12, 36, 2, "H : " + humidity , 1);
	};
} 

function displayIdleUtil(){
	if(isIdle){
		console.log("Displaying Time - ");
	}
	var intervalClock =  setInterval(displayClock, 1000);
	setTimeout(function (){
		clearInterval(intervalClock);
		if(isIdle){
			console.log("Displaying Temperature and Humidity - ");
		}
		var intervalTempHum = setInterval(displayTemperatureHumidity, 1000);
		setTimeout(function (){
			clearInterval(intervalTempHum);
			displayStockPrices();
			setTimeout(function(){
				if(isIdle){
					console.log("Displaying the User-customed string");
				}
				customDisplay();
			},5000);    
		}, 9000);
	}, 5000);
}


function setIdle(value){
    isIdle = value;
}

function displayIdle(){
  	getStockPrices();
    setInterval(displayIdleUtil, 25000);
}
module.exports.displayIdle =  displayIdle;
module.exports.setIdle = setIdle;
