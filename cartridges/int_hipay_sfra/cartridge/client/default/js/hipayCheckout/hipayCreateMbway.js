var hipay = require('./globalVariable').getGlobalVariable();

var config = {
    template: 'auto',
    selector: 'hipay-hostedfields-form-mbway' // form container div id
};

var mbwayInstance = hipay.create('mbway', config);

module.exports = {
    mbwayInstance: mbwayInstance
   }