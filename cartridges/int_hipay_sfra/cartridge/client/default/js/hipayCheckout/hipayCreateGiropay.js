var hipay = require('./globalVariable').getGlobalVariable();

var giropayInstance = hipay.create('giropay', window.hipayCustomPreferences.giropayConfig.config);

module.exports = {
    giropayInstance: giropayInstance
   }