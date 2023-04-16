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

    var transactionOperations = getTransactions(hipayPaymentId);
    var transactionIsCancellable = false;
    var transactionIsCapturable = false;

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
        transactionIsCancellable = transactionOperations.hiPayTransactionResponse.transaction.status === statuses.AUTHORIZED.code;
        transactionIsCapturable = transactionOperations.hiPayTransactionResponse.transaction.status !== statuses.COMPLETED.code;
    }

    return ISML.renderTemplate('order/paymentDialog', {
        order: order,
        transactionAmount: paymentInstr.paymentTransaction.amount,
        capturedAmount: capturedAmount,
        refundedAmount: refundedAmount,
        hipayPaymentId: hipayPaymentId,
        transactionIsCancellable: transactionIsCancellable,
        transactionIsCapturable: transactionIsCapturable,
        paymentStatus: paymentInstr.custom.hipayTransactionStatus
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
    var HiPayMaintenanceService = require('int_hipay_core/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');
    var hiPayMaintenanceService = new HiPayMaintenanceService();
    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CAPTURE);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CAPTURE);
    }
    
}
function CancelPayment(hipayPaymentId) {
    var paymentId = request.httpParameterMap.hipayPaymentId.value;
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);

    var helper = new HiPayHelper();
    var paymentInstr = helper.getOrderPaymentInstrument(order);
    var amount = paymentInstr.paymentTransaction.amount.value;

    var HiPayMaintenanceService = require('int_hipay_core/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');
    var hiPayMaintenanceService = new HiPayMaintenanceService();
    var op = HiPayMaintenanceService.OPERATION_CANCEL;
    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CANCEL);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CANCEL);
    }
}
function RefundPayment() {
    var paymentId = request.httpParameterMap.hipayPaymentId.value;
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var amount = request.httpParameterMap.amount.value;

    var HiPayMaintenanceService = require('int_hipay_core/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');
    var hiPayMaintenanceService = new HiPayMaintenanceService();
    try {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_REFUND);
    } catch (e) {
        response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_REFUND);
    }

}
function RefreshPaymentDetails() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    var capturedAmount = 0;
    var refundedAmount = 0;

    var helper = new HiPayHelper();
    var paymentInstr = helper.getOrderPaymentInstrument(order);

    var transactionOperations = getTransactions(hipayPaymentId);
    var transactionIsCancellable = false;
    var transactionIsCapturable = false;
    var paymentStatus = paymentInstr.custom.hipayTransactionStatus;
    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
        transactionIsCancellable = transactionOperations.hiPayTransactionResponse.transaction.state === statuses.AUTHORIZED.code;
        transactionIsCapturable = transactionOperations.hiPayTransactionResponse.transaction.state !== statuses.COMPLETED.code;
        paymentStatus = transactionOperations.hiPayTransactionResponse.transaction.message;
    }

    return ISML.renderTemplate('order/paymentDetails', {
        order: order,
        transactionAmount: paymentInstr.paymentTransaction.amount,
        capturedAmount: capturedAmount,
        refundedAmount: refundedAmount,
        hipayPaymentId: hipayPaymentId,
        transactionIsCancellable: transactionIsCancellable,
        transactionIsCapturable: transactionIsCapturable,
        paymentStatus: paymentStatus
    });
}

function ListPaymentCaptures() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    
    var transactionOperations = getTransactions(hipayPaymentId);
    var capturableAmount = 0;
    var capturedAmount = 0;
    var order = OrderMgr.getOrder(orderNo);
    var capture = {};
    var helper = new HiPayHelper();
    var paymentInstr = helper.getOrderPaymentInstrument(order);

    var amount = 0;

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        if (transactionOperations.hiPayTransactionResponse.transaction.status !== statuses.CANCELLED.code) {
            capturableAmount =  transactionOperations.hiPayTransactionResponse.transaction.order.amount - capturedAmount;
        }

        if (transactionOperations.hiPayTransactionResponse.transaction.capturedAmount > 0) {
            capture = {
                id: transactionOperations.hiPayTransactionResponse.transaction.transactionReference,
                amount: transactionOperations.hiPayTransactionResponse.transaction.capturedAmount,
                currency : transactionOperations.hiPayTransactionResponse.transaction.currency,
                status: statuses.CAPTURED.value,
                stateCode: statuses.CAPTURED.code
            };
        }
    }

    if (capturableAmount < 0) {
        capturableAmount = 0;
    }

    return ISML.renderTemplate('order/listPaymentCaptures', {
        paymentCaptures: capture,
        capturableAmount: capturableAmount,
        capturedAmount: capturedAmount,
        order: order
    });
}
function ListPaymentRefunds() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    
    var transactionOperations = getTransactions(hipayPaymentId);
    var capturableAmount = 0;

    var refundedAmount = 0;
    var refundableAmount = 0;
    var capturedAmount = 0;
    var refunds = {};
    var status = '';
    var stateCode = '';

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;      
        refundableAmount = parseFloat(capturedAmount - refundedAmount);

        if (parseFloat(refundedAmount) > 0) {

            if (refundableAmount > 0) {
                status = statuses.PARTIALLY_REFUNDED.value;
                stateCode = statuses.PARTIALLY_REFUNDED.code;
            } else {
                status = statuses.REFUNDED.value;
                stateCode = statuses.REFUNDED.code;
            }
            refunds = {
                id: transactionOperations.hiPayTransactionResponse.transaction.transactionReference,
                amount: refundedAmount,
                currency : transactionOperations.hiPayTransactionResponse.transaction.currency,
                status: status,
                stateCode: stateCode
            };
        }
    }
    
    if (refundableAmount < 0) {
        refundableAmount = 0;
    }
    
    return ISML.renderTemplate('order/listPaymentRefunds', {
        paymentRefunds: refunds,
        refundableAmount: refundableAmount,
        order: order,
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
