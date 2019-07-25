'use strict';

var server = require('server');

/**
 *  Handles HiPay server notifications
 */
server.post(
    'Notify',
    server.middleware.https,
    function (req, res, next) {
        var httpParams = request.httpParameterMap;

        require('~/cartridge/scripts/lib/hipay/modules/HiPayNotificationModule').hiPayProcessNotificationCall(httpParams);
        res.render('hipay/notifications/hipaynotification');

        return next();
    }
);

module.exports = server.exports();
