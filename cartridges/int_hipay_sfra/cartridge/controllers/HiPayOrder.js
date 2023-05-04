'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var OrderMgr = require('dw/order/OrderMgr');

var HiPayOrderModule = require('*/cartridge/scripts/lib/hipay/modules/hipayOrderModule');
var HiPayProcess = require('*/cartridge/scripts/lib/hipay/hipayProcess');
var statuses = require('*/cartridge/scripts/lib/hipay/hipayStatus').HiPayStatus;

function acceptPayment(req, res, next, mode) {
    var isHashValid = HiPayProcess.verifyHash();
    var isStatusValid = HiPayOrderModule.hiPayVerifyStatus(mode);
    var hiPayState = req.querystring.state;
    var isStateValid = ['completed', 'pending_reference'].indexOf(hiPayState) > -1;
    var params = {};
    var processOrder;
    var order;
    var error;
    var redirectURL;

    if (isHashValid && isStateValid && isStatusValid) {
        processOrder = HiPayOrderModule.hiPayProcessOrderCall();
        order = processOrder.order;
        error = processOrder.error;
        params = {
            order: order,
            hiPayState: error
        };

        if (error) {
            redirectURL = HiPayProcess.failOrder(params);
            res.redirect(redirectURL);
        } else {
            HiPayProcess.proceedWithOrder(order, res, next);
        }
    } else {
        params = {
            order: order,
            hiPayState: 'error'
        };
        redirectURL = HiPayProcess.failOrder(params);
        res.redirect(redirectURL);
    }

    return next();
}

function declinePayment(req, res, next, mode) {
    var isHashValid = HiPayProcess.verifyHash();
    var isStatusValid = HiPayOrderModule.hiPayVerifyStatus(mode);
    var order = OrderMgr.getOrder(req.querystring.orderid);
    var hiPayState = req.querystring.state;
    var result;

    if (hiPayState !== 'cancel') {
        hiPayState = 'decline';
    }

    if (!isHashValid || !isStatusValid) {
        res.redirect(URLUtils.url('Home-Show'));
    } else {
        var processOrder = HiPayOrderModule.hiPayProcessOrderCall();

        if (processOrder.error) {
            res.redirect(URLUtils.url('Home-Show'));
        } else {
            order = processOrder.order;
            result = {
                order: order,
                hiPayState: hiPayState
            };

            var redirectURL = HiPayProcess.failOrder(result);
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
        acceptPayment(req, res, next, statuses.ACCEPT.value);
    }
);

/** Handles HiPay pending payment */
server.get(
    'Pending',
    server.middleware.https,
    function (req, res, next) {
        acceptPayment(req, res, next, statuses.PENDING.value);
    }
);

/** Handles HiPay declined payment */
server.get(
    'Decline',
    server.middleware.https,
    function (req, res, next) {
        declinePayment(req, res, next, statuses.DECLINED.value);
    }
);

/** Handles HiPay cancelled payment */
server.get(
    'Cancel',
    server.middleware.https,
    function (req, res, next) {
        declinePayment(req, res, next, statuses.CANCEL.value);
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
