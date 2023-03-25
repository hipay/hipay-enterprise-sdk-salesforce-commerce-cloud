'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./hipayCheckout/hipayBrowserInfos'));
    processInclude(require('./hipayCheckout/hostedFields'));
});
