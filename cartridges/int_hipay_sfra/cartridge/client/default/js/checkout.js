'use strict';

var processInclude = require('base/util');

var checkout = window.SFRA6Enabled === true ? require('./checkout/checkoutSFRA6') : require('./checkout/checkoutSFRA5');

$(document).ready(function () {
    processInclude(checkout);
});
