var hipay = require('./globalVariable').getGlobalVariable();

var mbwayInstance = hipay.create('mbway', window.hipayCustomPreferences.mbwayConfig.config);

module.exports = {
    mbwayInstance: mbwayInstance
   }