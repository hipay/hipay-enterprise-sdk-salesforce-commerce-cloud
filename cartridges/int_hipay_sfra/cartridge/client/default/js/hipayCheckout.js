'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./hipayCheckout/hipayBrowserInfos'));
    processInclude(require('./hipayCheckout/hostedFields'));
    processInclude(require('./hipayCheckout/applePay'));
    processInclude(require('./hipayCheckout/paypalV2'));
});
