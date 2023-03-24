var hipay = require('./globalVariable').getGlobalVariable();

var config = {
    template: 'auto',
    selector: 'hipay-hostedfields-form-ideal' // form container div id
};

var idealInstance = hipay.create('ideal', config);

module.exports = {
    idealInstance: idealInstance
   }