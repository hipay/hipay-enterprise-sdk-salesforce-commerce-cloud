var hipay = require('./globalVariable').getGlobalVariable();

var idealInstance = hipay.create('ideal', window.hipayCustomPreferences.idealConfig.config);

module.exports = {
    idealInstance: idealInstance
   }