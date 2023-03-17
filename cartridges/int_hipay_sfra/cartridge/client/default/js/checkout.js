'use strict';

var processInclude = require('base/util');

require('./checkout/billing');

$(document).ready(function () {
    processInclude(require('./checkout/checkout-hipay'));
});
