'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./hipayCheckout/hipayBrowserInfos'));
    processInclude(require('./hipayCheckout/hipayCreateCard'));
    processInclude(require('./hipayCheckout/hipayTokenize'));
    processInclude(require('./hipayCheckout/hipayCreateIdeal'));
});
