'use strict';

var OrderMgr         = require('dw/order/OrderMgr'),
    Transaction      = require('dw/system/Transaction');

var HiPayOrderModule = require('~/cartridge/scripts/lib/hipay/modules/HiPayOrderModule');

/** Verifies HiPay requests */
function VerifyHash() {
    return HiPayOrderModule.hiPayVerifyRequest();
}

/**
* Place an Order after being paid with HiPay
*
* @param {dw.order.Order} order
*/
function ProceedWithOrder(order, res, next) {
    var hiPayRedirectURL = dw.web.URLUtils.https('COPlaceOrder-Submit', 'order_id', order.orderNo, 'order_token', order.orderToken, dw.web.CSRFProtection.getTokenName(), dw.web.CSRFProtection.generateToken());

    res.redirect(hiPayRedirectURL);
    next();
}

/**
* Handles a fail order
*
* @param {Object} args - Current order and hiPayState
*/
function FailOrder(args) {
    var order            = args.order,
        hiPayState       = args.hiPayState,
        Status           = require('dw/system/Status'),
        hiPayRedirectURL,
        status;

    if (order != null) {
        Transaction.wrap(function() {
            status = OrderMgr.failOrder(order);
        });
        if (status.status === Status.OK) {
            hiPayRedirectURL = dw.web.URLUtils.https('COPlaceOrder-Submit', 'order_token', order.orderToken, 'order_id', order.orderNo, 'paymentStatus', hiPayState, dw.web.CSRFProtection.getTokenName(), dw.web.CSRFProtection.generateToken());
        }
    }

    return hiPayRedirectURL;
}

/**
* This function fails all Orders that are in CREATED state.
* Such orders are considered hung in the system during the two step checkout.
*
*/
function ClearHungOrders() {
    var HiPayLogger = require("~/cartridge/scripts/lib/hipay/HiPayLogger"),
        Site        = require('dw/system/Site'),
        Calendar    = require('dw/util/Calendar'),
        Order       = require('dw/order/Order'),
        log         = new HiPayLogger("ClearHungOrders"),
        minutesBack = Site.getCurrent().getCustomPreferenceValue("hipayHungOrderTimeout"),
        startDate   = new Calendar();

    startDate.setTimeZone(Site.current.getTimezone());
    startDate.add(Calendar.MINUTE, -minutesBack);

    try {
        OrderMgr.processOrders(failHungOrder, "status = {0} AND creationDate < {1}", Order.ORDER_STATUS_CREATED, startDate.getTime());
    } catch (e) {
        var error = "Error while fetching hung orders ::: " + e.message;
        log.error(error);
    }
}

function failHungOrder(order) {
    try {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
    } catch (e) {
        var error = "Error while fail hung order ::: " + e.message;
        log.error(error);
    }
}

/** @see {@link module:controllers/HiPayProcess~VerifyHash} */
exports.VerifyHash = VerifyHash;
/** @see {@link module:controllers/HiPayProcess~ProceedWithOrder} */
exports.ProceedWithOrder = ProceedWithOrder;
/** @see {@link module:controllers/HiPayProcess~FailOrder} */
exports.FailOrder = FailOrder;
/** @see {@link module:controllers/HiPayOrder~ClearHungOrders} */
exports.ClearHungOrders = ClearHungOrders;
