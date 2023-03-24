var hipay = require('./globalVariable').getGlobalVariable();

var config = {
    template: 'auto',
    selector: 'hipay-hostedfields-form-giropay' // form container div id
};

var giropayInstance = hipay.create('giropay', config);

module.exports = {
    giropayInstance: giropayInstance
   }