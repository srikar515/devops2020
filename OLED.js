var i2c = require('i2c-bus');
var i2cBus = i2c.openSync(1);
var font = require('oled-font-5x7');
var oLed = require('oled-i2c-bus');

function oled(ioAddress){
        var root = this;
        this.ioAddress = ioAddress;
        this.opts = {
                width : 128,
                height : 64,
                address : root.ioAddress
        };
        this.oled = new oLed(i2cBus, root.opts);
        this.turnOnDisplay = function (){
                root.oled.turnOnDisplay();
        };

        this.init = function (){
                root.oled.clearDisplay();
        };
        this.newWriteString = function (x, y, fontSize, string, color){
                root.init();
                root.oled.setCursor(x, y);
                root.oled.writeString(font, fontSize, string, color, true);
                root.oled.update();
        };
        
        this.writeString = function (x, y, fontSize, string, color){
                root.oled.setCursor(x, y);
                root.oled.writeString(font, fontSize, string, color, true);
        };
	
        this.turnOffDisplay = function (){
                root.oled.turnOffDisplay();
        };
	this.clear = function (){ 
                root.oled.clearDisplay();
        };
}
module.exports.oled = oled; 
