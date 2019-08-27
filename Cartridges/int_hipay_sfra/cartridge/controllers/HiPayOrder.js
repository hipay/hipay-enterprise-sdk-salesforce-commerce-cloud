'use strict';

var server   = require('server'),
    URLUtils = require('dw/web/URLUtils'),
    OrderMgr = require('dw/order/OrderMgr');

var HiPayOrderModule = require('~/cartridge/scripts/lib/hipay/modules/HiPayOrderModule'),
    HiPayProcess     = require('~/cartridge/scripts/lib/hipay/HiPayProcess');

function acceptPayment(res, next) {
    var isHashValid = HiPayProcess.VerifyHash(),
        params      = {},
        processOrder,
        order,
        error,
        redirectURL;

    if (isHashValid) {
        processOrder = HiPayOrderModule.hiPayProcessOrderCall();
        order        = processOrder.order;
        error        = processOrder.error;
        params       = {
            order      : order,
            hiPayState : error
        };

        if (error) {
            redirectURL = HiPayProcess.FailOrder(params);
            res.redirect(redirectURL);
        } else {
            HiPayProcess.ProceedWithOrder(order, res, next);
        }
    } else {
        params = {
            order      : order,
            hiPayState : "error"
        };
        redirectURL = HiPayProcess.FailOrder(params);
        res.redirect(redirectURL);
    }

    return next();
}

function declinePayment(req, res, next) {
    var isHashValid = HiPayProcess.VerifyHash(),
        order       = OrderMgr.getOrder(req.querystring.orderid),
        hiPayState  = req.querystring.state,
        hiPayRedirectURL,
        result;

    if (hiPayState !== "cancel") {
        hiPayState = "decline";
    }

    if (!isHashValid) {
        res.redirect(URLUtils.url('Home-Show'));
    } else {
        var processOrder = HiPayOrderModule.hiPayProcessOrderCall();

        if (processOrder.error) {
            res.redirect(URLUtils.url('Home-Show'));
        } else {
            order  = processOrder.order;
            result = {
                order      : order,
                hiPayState : hiPayState
            };

            var redirectURL = HiPayProcess.FailOrder(result);
            res.redirect(redirectURL);
        }
    }

    return next();
}

/** Handles HiPay accepted payment */
server.get(
    'Accept',
    server.middleware.https,
    function (req, res, next) {
        acceptPayment(res, next);
    }
);

/** Handles HiPay pending payment */
server.get(
    'Pending',
    server.middleware.https,
    function (req, res, next) {
        acceptPayment(res, next);
    }
);

/** Handles HiPay declined payment */
server.get(
    'Decline',
    server.middleware.https,
    function (req, res, next) {
        declinePayment(req, res, next);
    }
);

/** Handles HiPay cancelled payment */
server.get(
    'Cancel',
    server.middleware.https,
    function (req, res, next) {
        declinePayment(req, res, next);
    }
);

/** Handles HiPay error payment response */
server.get(
    'Error',
    server.middleware.https,
    function (req, res, next) {
        res.render('hipay/order/error');

        return next();
    }
);

module.exports = server.exports();
