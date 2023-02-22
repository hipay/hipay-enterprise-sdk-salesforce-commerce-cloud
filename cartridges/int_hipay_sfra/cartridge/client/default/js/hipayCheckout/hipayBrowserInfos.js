'use strict'
var hipay = require('./globalVariable').getGlobalVariable();

let browserInfo = hipay.getBrowserInfo();

$('#browserInfo').val(JSON.stringify(browserInfo));