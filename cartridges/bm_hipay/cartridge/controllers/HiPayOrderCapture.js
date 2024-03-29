'use strict';

/**
* HiPayOrderCapture.js
*
* HiPay extension controller. Handles search and capture order.
*
* @module  controllers/HiPayOrderCapture
*/

/* API includes */
var ISML = require('dw/template/ISML');
var PaymentMgr = require('dw/order/PaymentMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

function cont(args) {
    var topUrl = URLUtils.url('SiteNavigationBar-ShowMenuitemOverview', 'CurrentMenuItemId', request.httpParameterMap.CurrentMenuItemId);
    var mainMenuName = request.httpParameterMap.mainmenuname.stringValue;

    ISML.renderTemplate('hipay/searchorder', {
        ContinueURL: URLUtils.https('HiPayOrderCapture-HandleForm'),
        CurrentForms: session.forms,
        Order: args.Order,
        OperationStatus: args.OperationStatus,
        TOP_URL: topUrl,
        MAIN_MENU_NAME: mainMenuName
    });
}

function start() {
    var operationStatus = {};

    if (!empty(session.forms.searchorder.orderID.value)) {
        var orderNo = session.forms.searchorder.orderID.value;
        var order = OrderMgr.getOrder(orderNo);

        if (empty(order)) { /* can not load requested order. */
            operationStatus.valid = false;
            operationStatus.msg = Resource.msg('hipay_bm.capture.order.error', 'hipay_bm', null);
        } else {
            session.forms.searchorder.clearFormElement();
        }

        return cont({
            Order: order,
            OperationStatus: operationStatus
        });
    }

    return cont({
        OperationStatus: operationStatus
    });
}

function handleForm() { // eslint-disable-line consistent-return
    var triggeredAction = request.triggeredFormAction;
    var operationStatus = {};

    if (!empty(triggeredAction) && triggeredAction.formId === 'search') {
        start();
    } else if (!empty(triggeredAction) && triggeredAction.formId === 'capture') {
        var captureAmount = session.forms.searchorder.captureAmount.value;
        var orderNo = session.forms.searchorder.captureOrderID.value;
        var order = OrderMgr.getOrder(orderNo);
        var response = null;

        var hipayPaymentMethod = order.paymentInstrument.paymentMethod;
        var paymentMethod = PaymentMgr.getPaymentMethod(hipayPaymentMethod);

        if (paymentMethod.custom.hipayOnlyCompleteCapture && captureAmount < order.totalGrossPrice) {
            operationStatus.valid = false;
            operationStatus.msg = Resource.msg('hipay_bm.capture.partialerror', 'hipay_bm', null);

            return cont({
                OperationStatus: operationStatus,
                Order: order
            });
        }

        try {
            response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, captureAmount, 'capture');
        } catch (e) {
            response = require('int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule').hiPayMaintenanceRequest(order, captureAmount, 'capture');
        }

        if (response.error) {
            operationStatus.valid = false;
            operationStatus.msg = Resource.msg('hipay_bm.capture.error', 'hipay_bm', null);
        } else {
            operationStatus.valid = true;
            operationStatus.msg = Resource.msg('hipay_bm.capture.success', 'hipay_bm', null);
        }

        return cont({
            OperationStatus: operationStatus,
            Order: order
        });
    }
}

exports.Start = start;
exports.Start.public = true;

exports.HandleForm = handleForm;
exports.HandleForm.public = true;

