'use strict';

var server = require('server');

var hipayNotificationModule = require('*/cartridge/scripts/lib/hipay/modules/hipayNotificationModule');

/**
 *  Handles HiPay server notifications
 */
server.post(
    'Notify',
    server.middleware.https,
    function (req, res, next) {
        if (hipayNotificationModule.checkSignature(request)) {
            hipayNotificationModule.saveNotification(request);
        }

        res.render('hipay/notifications/hipayNotification');

        return next();
    }
);

module.exports = server.exports();
