'use strict'

var Transaction = require('dw/system/Transaction');
var Calendar = require('dw/util/Calendar');
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');
var Order = require('dw/order/Order');
var Status = require('dw/system/Status');

var log = require('dw/system/Logger').getLogger('ClearHungOrders');
var errorCount = 0;

/**
 * Fail an order.
 *
 * @param {*} order
 */
function failHungOrder(order) {
    try {
        log.info('Processing Order #{0}', order.getOrderNo());
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
    } catch (e) {
        log.error('Error while failing hung order. Error: {0}', e.message);
        errorCount++;
    }
}

/**
* This function fails all Orders that are in CREATED state.
* Such orders are considered hung in the system during the two step checkout.
*
 * @param {*} options
 * @param {dw.job.JobStepExecution} jobStepExecution - Job Step Execution
 * @return {dw.system.Status} Job step execution status
*/
function ClearHungOrders() {
    var minutesBack = Site.getCurrent().getCustomPreferenceValue('hipayHungOrderTimeout');
    var minutesBack = 1;
    log.info('Starting to process hung orders older than {0} minutes.', minutesBack);

    var startDate = new Calendar();
    startDate.setTimeZone(Site.current.getTimezone());
    startDate.add(Calendar.MINUTE, -minutesBack);

    try {
        OrderMgr.processOrders(failHungOrder, "status = {0} AND creationDate < {1}", Order.ORDER_STATUS_CREATED, startDate.getTime()); // eslint-disable-line
    } catch (e) {
        log.error('Error while fetching hung orders. Error: {0}', e.message);
        errorCount++;
    }

    return (errorCount > 0)
        ? new Status(Status.ERROR)
        : new Status(Status.OK);
}

exports.execute = ClearHungOrders;
