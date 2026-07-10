var Calendar = require('dw/util/Calendar');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('HipayProcessNotifications');

var Constants = require('*/cartridge/scripts/util/hipayConstants');
var hipayNotificationModule = require('*/cartridge/scripts/lib/hipay/modules/hipayNotificationModule');

/**
 * Returns true when the error is an optimistic locking conflict that is safe to retry.
 * All other errors should not be retried — they indicate a data or logic problem.
 * @param {*} e
 * @returns {boolean}
 */
function isLockingConflict(e) {
    if (e && e.javaClass) {
        return String(e.javaClass).indexOf('OptimisticLocking') > -1;
    }
    return !!(e && e.message && String(e.message).indexOf('OptimisticLocking') > -1);
}

/**
 * Iterates through all pending notifications and processes each one.
 * Each notification is retried up to MAX_ATTEMPTS times on optimistic locking
 * conflicts; other errors are logged and not retried. The notification custom
 * object is only removed from the queue after a successful processing attempt.
 * @returns {dw.system.Status}
 */
function execute() {
    var MAX_ATTEMPTS = 3;

    // Process notifications received at least 10 seconds ago to avoid race conditions.
    var calendar = new Calendar();
    calendar.set(Calendar.SECOND, calendar.get(Calendar.SECOND) - 10);
    var notifications = CustomObjectMgr.queryCustomObjects(
        Constants.OBJ_NOTIFICATION,
        '',
        'custom.hipayTimestamp ASC'
    );

    while (notifications.hasNext()) {
        var currentNotification = notifications.next();
        var notificationId = currentNotification.custom.id;
        Logger.info('Process HiPay Notification :: {0}', notificationId);

        var notification;
        try {
            notification = JSON.parse(String(currentNotification.custom.notification || '{}'));
        } catch (parseErr) {
            Logger.error('Skipping notification {0}: failed to parse payload: {1}', notificationId, String(parseErr));
            continue;
        }

        // Used only in log messages — not card data or PII.
        var orderRef = notification['order[id]'] || 'unknown';
        var attempt = 0;
        var processed = false;

        while (attempt < MAX_ATTEMPTS && !processed) {
            attempt++;
            try {
                hipayNotificationModule.processNotification(notification);
                // Remove the queued custom object only after the order has been updated successfully.
                // Keeping it on any error ensures the notification is retried on the next job run.
                try {
                    Transaction.wrap(function () {
                        CustomObjectMgr.remove(currentNotification);
                    });
                } catch (removeErr) {
                    if (isLockingConflict(removeErr)) {
                        // A concurrent job instance already processed and removed this notification.
                        // The order update succeeded on that instance; nothing left to do here.
                        Logger.info(
                            'Notification {0} already removed by a concurrent job instance, treating as completed',
                            notificationId
                        );
                    } else {
                        throw removeErr;
                    }
                }
                processed = true;
            } catch (e) {
                if (isLockingConflict(e) && attempt < MAX_ATTEMPTS) {
                    Logger.warn(
                        'Optimistic locking conflict on notification {0} for order {1}, attempt {2}/{3}, retrying',
                        notificationId, orderRef, attempt, MAX_ATTEMPTS
                    );
                } else {
                    Logger.error(
                        'Failed to process notification {0} for order {1} after {2} attempt(s): {3}',
                        notificationId, orderRef, attempt, String(e)
                    );
                    break;
                }
            }
        }
    }
    notifications.close();

    return new Status(Status.OK);
}

exports.execute = execute;
