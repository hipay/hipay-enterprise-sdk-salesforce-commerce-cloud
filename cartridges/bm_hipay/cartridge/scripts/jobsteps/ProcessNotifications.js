var Calendar = require('dw/util/Calendar');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('HipayProcessNotifications');

var Constants = require('*/cartridge/scripts/util/hipayConstants');
var hipayNotificationModule = require('*/cartridge/scripts/lib/hipay/modules/hipayNotificationModule');

/**
 * Iterates through all notifications
 * @returns {void}
*/
function execute() {
    // Process notifications received at least 10 seconds ago to avoid race conditions.
    var calendar = new Calendar();
    calendar.set(Calendar.SECOND, calendar.get(Calendar.SECOND) - 10);
    var notifications = CustomObjectMgr.queryCustomObjects(
        Constants.OBJ_NOTIFICATION,
        '',
        'custom.hipayTimestamp ASC'
    );

    while (notifications.hasNext()) {
        // Catch errors per notification so a single failure does not abort the entire job run.
        try {
            Transaction.wrap(function () {
                var currentNotification = notifications.next();
                Logger.info('Process HiPay Notification :: {0}', currentNotification.custom.id);

                var notification = JSON.parse(currentNotification.custom.notification || '{}');
                hipayNotificationModule.processNotification(notification);

                CustomObjectMgr.remove(currentNotification);
            });
        } catch (e) {
            Logger.error('Failed to process HiPay notification: ' + e.message);
        }
    }
    notifications.close();

    return new Status(Status.OK);
}

exports.execute = execute;
