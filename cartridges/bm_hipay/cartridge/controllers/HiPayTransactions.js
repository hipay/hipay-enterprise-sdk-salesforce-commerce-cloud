'use strict';

/**
* HiPayTransactions.js
*
* HiPay extension controller. Handles search and capture order.
*
* @module  controllers/HiPayTransactions
*/

/* API includes */
var ISML = require('dw/template/ISML');
var PaymentMgr = require('dw/order/PaymentMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

var hipayCommonHelper = require('int_hipay_sfra/cartridge/scripts/lib/hipay/commonHelper');
const hipayConstants = require('int_hipay_sfra/cartridge/scripts/lib/hipay/constants');
const hipayApiFacade = require('int_hipay_sfra/cartridge/scripts/lib/hipay/api/facade');

var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var ArrayList = require('dw/util/ArrayList');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var PagingModel = require('dw/web/PagingModel');
var Order = require('dw/order/Order');
var PropertyComparator = require('dw/util/PropertyComparator');

var statuses = require('int_hipay_core/cartridge/scripts/lib/hipay/hipayStatus').HiPayStatus;
var HiPayHelper = require('int_hipay_sfra/cartridge/scripts/lib/hipay/hipayHelper');

/**
 * Combine orders and ingenicoNewTransactions Custom Objects into one array for pagination
 *
 * @param {string} orderNo - Order number used in "Search by order number" feature
 * @param {string} orderUUID - Optional, in case a specific order needs to be returned
 * @returns {dw.util.ArrayList} Combined array with all orders
 */
 function getOrders(orderNo, orderUUID) {
    var stt = hipayConstants.ORDER_STATUS_FAILED;
    var orders = new ArrayList();
    var order;
    var paymentInstrument;
    var orderDate;
    var obj;

    var orderIndex = 0;
    var maxSystemOrdersCount = 9000;
    var maxingenicoOrdersCount = 9000;
    var hipayOrdersCount = 0;
    if (hipayOrdersCount < maxingenicoOrdersCount) {
        maxSystemOrdersCount = 18000 - hipayOrdersCount;
    }
    
    var queryString = '';
    var sortString = 'creationDate desc';
    var args = [];

    if (!empty(orderUUID)){
        queryString = 'UUID = {0}';
        args.push(orderUUID);
    } else if (!empty(orderNo)) {
        queryString = 'status != {0} AND orderNo = {1} ';
        args.push(Order.ORDER_STATUS_FAILED);
        args.push(orderNo);
    } else {
        queryString = 'status != {0}';
        args.push(Order.ORDER_STATUS_FAILED);
        args.push(orderNo);
    }

    var searchOrders = OrderMgr.searchOrders(
        queryString,
        sortString,
        args
    );

    while (searchOrders.hasNext()) {
        var order = searchOrders.next();

        orderDate = new Date(order.creationDate);

        paymentInstrument = hipayCommonHelper.getHipayPaymentInstrument(order);
        if (paymentInstrument === null) {
            continue; // eslint-disable-line no-continue
        }

        var orderInfo = {
            orderNo: order.orderNo,
            orderDate: StringUtils.formatCalendar(new Calendar(orderDate), 'M/dd/yy h:mm a'),
            createdBy: order.createdBy,
            isRegestered: order.customer.registered,
            customer: order.customerName,
            email: order.customerEmail,
            orderTotal: order.totalGrossPrice,
            currencyCode: order.getCurrencyCode(),
            hipayAmount: paymentInstrument.getPaymentTransaction().getAmount(),
            hipayTransactionID: paymentInstrument.getPaymentTransaction().getTransactionID(),
            captureAmount: order.capturedAmount.value,
            refundedAmount: order.refundedAmount.value,
            status: order.status,
            paymentStatus: order.paymentStatus,
            isCustom: false,
            notes: order.notes
        }

        orders.push(orderInfo);
    }

    return orders;
}

/**
 * Returns an object that specifies whether a transaction can be captured or cancelled.
 *
 * @param {dw.order.Order} order the referenced order
 * @param {Object} paymentDetailsResponse the response from the get-payment API
 * @returns {Object} an object that specifies whether a transaction can be captured or cancelled
 */
 function getAllowedTransactionOperations(order, paymentDetailsResponse) {
    let res = {};
    if (paymentDetailsResponse) {
        res.transactionIsCancellable = '';
        //res.transactionIsCancellable = order.custom.ingenicoOgoneStatusCategory.value !== hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY && paymentDetailsResponse.paymentOutput.amountOfMoney.amount > 0;
    }

    res.transactionIsCapturable = '';
    //res.transactionIsCapturable = order.custom.ingenicoOgoneStatusCategory.value !== hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY;

    return res;
}

function cont(args) {
    ISML.renderTemplate('order/orderList', {
        orderUUID: args.orderUUID,
        PagingModel: args.orderPagingModel
    });
}

function orders() {
    var orderNo;
    var orderUUID = !empty(request.httpParameterMap.OrderID.stringValue) ? request.httpParameterMap.OrderID.stringValue : null;
    var alternativeFlow = false;
    var orders;

    if (request.httpParameterMap.transactionId.submitted && !empty(request.httpParameterMap.transactionId.stringValue)) {
        var transactionId = request.httpParameterMap.transactionId.stringValue;

        var systemOrder = SystemObjectMgr.querySystemObjects('Order', 'custom.hipayTransactionID LIKE {0}', 'creationDate desc', transactionId);
        var firstOrder = (new ArrayList(systemOrder)).toArray()[0];
        if (firstOrder) {
            orderNo = firstOrder.orderNo;
        }
        systemOrder.close();

    }

    if (!orderNo) {
        alternativeFlow = true;
    }

    if (alternativeFlow) {
        orderNo = empty(request.httpParameterMap.orderNo.stringValue) ? '' : request.httpParameterMap.orderNo.stringValue;
        orderNo = request.httpParameterMap.transactionId.submitted ? '0' : orderNo;
        orderNo = request.httpParameterMap.transactionId.stringValue === '' ? '' : orderNo;
    }

    orders = getOrders(orderNo, orderUUID);

    var pageSize = !empty(request.httpParameterMap.pagesize.intValue) ? request.httpParameterMap.pagesize.intValue : 10;
    var currentPage = request.httpParameterMap.page.intValue ? request.httpParameterMap.page.intValue : 1;
    pageSize = pageSize === 0 ? orders.length : pageSize;
    var start = pageSize * (currentPage - 1);

    var orderPagingModel = new PagingModel(orders);

    orderPagingModel.setPageSize(pageSize);
    orderPagingModel.setStart(start);

    if (empty(orders)) { /* can not load requested order. */
        operationStatus.valid = false;
        operationStatus.msg = Resource.msg('hipay_bm.capture.order.error', 'hipay_bm', null);
    } else {
        session.forms.searchorder.clearFormElement();
    }

    return ISML.renderTemplate('order/orderList', {
        orderUUID: orderUUID,
        PagingModel: orderPagingModel
    });
}

function PaymentDialog() {    
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    var capturedAmount = 0;
    var refundedAmount = 0;

    var helper = new HiPayHelper();
    var paymentInstr = helper.getOrderPaymentInstrument(order);

/*
    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, paymentInstr.paymentTransaction.amount.value.toString());
    } catch (e) {
        var test = e;
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, paymentInstr.paymentTransaction.amount.value.toString());
    }
*/


    var transactionOperations = getTransactions(hipayPaymentId);
    if (!empty(transactionOperations.hiPayTransactionResponse)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
    }
    
    return ISML.renderTemplate('order/paymentDialog', {
        order: order,
        paymentDetailsResponse: paymentInstr,
        capturedAmount: capturedAmount,
        refundedAmount: refundedAmount,
        hipayPaymentId: hipayPaymentId
    });
}

function getTransactions (transactionId) {
    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayTransactionModule').hiPayTransactionRequest(transactionId);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayTransactionModule').hiPayTransactionRequest(transactionId);
    }
    return response;
}

function CapturePayment() {
    var paymentId = request.httpParameterMap.hipayPaymentId.value;
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var amount = request.httpParameterMap.amount.value;

    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), OPERATION_CAPTURE);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), OPERATION_CAPTURE);
    }
    
}
function CancelPayment(hipayPaymentId) {
    
}
function RefundPayment(hipayPaymentId) {
    var paymentId = request.httpParameterMap.hipayPaymentId.value;
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var amount = request.httpParameterMap.amount.value;

    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenance.OPERATION_REFUND);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenance.OPERATION_REFUND);
    }   

}
function RefreshPaymentDetails(hipayPaymentId, orderId) {
    
}
function ListPaymentCaptures() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    
    var transactionOperations = getTransactions(hipayPaymentId);
    var capturableAmount = 0;
    var capturedAmount = 0;
    var order = OrderMgr.getOrder(orderNo);

    //var hipayPaymentMethod = order.paymentInstrument.paymentMethod;
    //var paymentMethod = PaymentMgr.getPaymentMethod(hipayPaymentMethod);
    var captures= {};

    var helper = new HiPayHelper();
    var paymentInstr = helper.getOrderPaymentInstrument(order);

    var amount = 0;
    var transactionIsCancellable = false;
    var transactionIsCapturable = false;

    if (!empty(transactionOperations.hiPayTransactionResponse)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        capturableAmount =  transactionOperations.hiPayTransactionResponse.transaction.order.amount - capturedAmount;
        captures = transactionOperations.hiPayTransactionResponse.transaction;


        captures = {
            id: transactionOperations.hiPayTransactionResponse.transaction.transactionReference,
            amount: transactionOperations.hiPayTransactionResponse.transaction.capturedAmount,
            currency : transactionOperations.hiPayTransactionResponse.transaction.currency,
            status: transactionOperations.hiPayTransactionResponse.transaction.state,
            stateCode: transactionOperations.hiPayTransactionResponse.transaction.status
        }


        transactionIsCancellable = transactionOperations.hiPayTransactionResponse.transaction.state !== statuses.COMPLETED.code && capturableAmount > 0;
        transactionIsCapturable = transactionOperations.hiPayTransactionResponse.transaction.state !== statuses.COMPLETED.code;
    }

    if (capturableAmount < 0) {
        capturableAmount = 0;
    }
    var  titi = captures;
    return ISML.renderTemplate('order/listPaymentCaptures', {
        paymentCaptures: captures,
        paymentDetailsResponse: transactionOperations.hiPayTransactionResponse,
        capturableAmount: capturableAmount,
        capturedAmount: capturedAmount,
        order: order,
        transactionIsCancellable: transactionIsCancellable,
        transactionIsCapturable: transactionIsCapturable
    });
}
function ListPaymentRefunds() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    
    var transactionOperations = getTransactions(hipayPaymentId);
    var capturableAmount = 0;
    
    return ISML.renderTemplate('order/listPaymentRefunds', {
        paymentCaptures: 'paymentCaptures.captures',
        paymentDetailsResponse: 'paymentDetails',
        capturableAmount: 'capturableAmount',
        capturedAmount: 'capturedAmount',
        order: order,
        transactionIsCancellable: 'transactionOperations.transactionIsCancellable',
        transactionIsCapturable: 'transactionOperations.transactionIsCapturable'
    });
}

exports.Orders = orders;
exports.Orders.public = true;

exports.PaymentDialog = PaymentDialog;
exports.PaymentDialog.public = true;

exports.CapturePayment = CapturePayment;
exports.CapturePayment.public = true;

exports.CancelPayment = CancelPayment;
exports.CancelPayment.public = true;

exports.RefundPayment = RefundPayment;
exports.RefundPayment.public = true;

exports.RefreshPaymentDetails = RefreshPaymentDetails;
exports.RefreshPaymentDetails.public = true;

exports.ListPaymentCaptures = ListPaymentCaptures;
exports.ListPaymentCaptures.public = true;

exports.ListPaymentRefunds = ListPaymentRefunds;
exports.ListPaymentRefunds.public = true;
