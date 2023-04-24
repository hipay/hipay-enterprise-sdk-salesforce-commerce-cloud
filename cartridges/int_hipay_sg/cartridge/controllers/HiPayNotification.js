'use strict';

/**
* HiPayNotification.js
*
* @module  controllers/HiPayNotification
*/

/* API includes */
var ISML = require('dw/template/ISML');
var guard = require('*/cartridge/scripts/guard');

/* Handles HiPay server notifications */
function notify() {
    var hipayNotificationModule = require('*/cartridge/scripts/lib/hipay/modules/hipayNotificationModule');

    if (hipayNotificationModule.checkSignature(request)) {
        hipayNotificationModule.saveNotification(request);
    }

    ISML.renderTemplate('hipay/notifications/hipaynotification');
}

/** @see {@link module:controllers/HiPayNotification~notify} */
exports.Notify = guard.ensure(['post'], notify);
