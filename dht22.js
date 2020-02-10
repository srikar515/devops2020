var rpiDhtSensor = require('rpi-dht-sensor');

function dht22(gpioPin){
        var root = this;
        this.gpioPin = gpioPin;
        this.dht = new rpiDhtSensor.DHT22(gpioPin);
        this.init= function (){
                root.dht = new rpiDhtSensor.DHT22(root.gpioPin);
        };
  
        this.getTemperature = function (showCelsius = false){
                while(true){
                        var readout = root.dht.read();
                        var temperature = parseFloat(readout.temperature.toFixed(2));
                  
                        if( temperature != 0) {
                        	if(!showCelsius) {
                  				temperature = (temperature * 9/5) + 32;
                        	}
                            return new String(temperature.toFixed(2));
                        }
                }
        };
        
        this.getHumidity = function (){
                while(true){
                        var readout = root.dht.read();
                        var humidity = parseFloat(readout.humidity.toFixed(2));
                        if( humidity != 0) {
                                return readout.humidity.toFixed(2);
                        }
                } 
        };
        
        this.getTemperatureHumidity = function (){
                var readout = root.dht.read();
                var temperatureHumidity = {
                                "temperature" : readout.temperature.toFixed(2),
                                "humidity" : readout.temperature.toFixed(2) 
                };
                return temperatureHumidity;
        };
}

module.exports.dht22 = dht22;
