'use strict';

var HiPayOrderModule = require('*/cartridge/scripts/lib/hipay/modules/hipayOrderModule');

/** Verifies HiPay requests */
function verifyHash() {
    return HiPayOrderModule.hiPayVerifyRequest();
}

/**
* Place an Order after being paid with HiPay
*
* @param {dw.order.Order} order
*/
function proceedWithOrder(order) {
    var ISML = require('dw/template/ISML');
    var URLUtils = require('dw/web/URLUtils');
    var CSRFProtection = require('dw/web/CSRFProtection');
    var hiPayRedirectURL;

    hiPayRedirectURL = URLUtils.https('COPlaceOrder-Submit', 'order_id', order.orderNo, 'order_token', order.orderToken, CSRFProtection.getTokenName(), CSRFProtection.generateToken());
    ISML.renderTemplate('hipay/hosted/hipayredirect', {
        HiPayRedirectURL: hiPayRedirectURL
    });
}

/**
* Handles a fail order
*
* @param {Object} args - Current order and hiPayState
*/
function failOrder(args) {
    var order = args.order;
    var hiPayState = args.hiPayState;
    var Status = require('dw/system/Status');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var OrderMgr = require('dw/order/OrderMgr');
    var ISML = require('dw/template/ISML');
    var hiPayRedirectURL;
    var status;

    if (order != null) {
        Transaction.wrap(function () {
            status = OrderMgr.failOrder(order, true);
        });
        if (status.status === Status.OK) {
            hiPayRedirectURL = URLUtils.https('COSummary-Start', 'status', hiPayState);
        }
    }

    hiPayRedirectURL = URLUtils.https('COSummary-Start');
    ISML.renderTemplate('hipay/hosted/hipayredirect', {
        HiPayRedirectURL: hiPayRedirectURL
    });
}


/** @see {@link module:controllers/HiPayProcess~VerifyHash} */
exports.verifyHash = verifyHash;
/** @see {@link module:controllers/HiPayProcess~ProceedWithOrder} */
exports.proceedWithOrder = proceedWithOrder;
