'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var HiPayOrderModule = require('*/cartridge/scripts/lib/hipay/modules/hipayOrderModule');

// Verifies HiPay requests
function verifyHash() {
    return HiPayOrderModule.hiPayVerifyRequest();
}

/**
* Place an Order after being paid with HiPay
*
* @param {dw.order.Order} order
*/
function proceedWithOrder(order, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var CSRFProtection = require('dw/web/CSRFProtection');

    var hiPayRedirectURL = URLUtils.https('COPlaceOrder-Submit', 'order_id', order.orderNo, 'order_token', order.orderToken, CSRFProtection.getTokenName(), CSRFProtection.generateToken());

    res.redirect(hiPayRedirectURL);
    next();
}

/**
* Handles a fail order
*
* @param {Object} args - Current order and hiPayState
*/
function failOrder(args) {
    var URLUtils = require('dw/web/URLUtils');
    var CSRFProtection = require('dw/web/CSRFProtection');
    var Status = require('dw/system/Status');
    var order = args.order;
    var hiPayState = args.hiPayState;
    var status;

    if (order != null) {
        Transaction.wrap(function () {
            status = OrderMgr.failOrder(order, true);
        });
        if (status.status === Status.OK) {
            return URLUtils.https('COPlaceOrder-Submit', 'order_token', order.orderToken, 'order_id', order.orderNo, 'paymentStatus', hiPayState, CSRFProtection.getTokenName(), CSRFProtection.generateToken());
        }
    }

    return URLUtils.https('Error-Start');
}

module.exports = {
    failOrder: failOrder,
    proceedWithOrder: proceedWithOrder,
    verifyHash: verifyHash
};
