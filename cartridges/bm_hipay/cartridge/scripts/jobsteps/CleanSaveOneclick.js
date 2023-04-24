'use strict';

/* Script Modules */
var Logger = require('dw/system/Logger').getLogger('Hipay-stepCleanSaveOneclick');
var Status = require('dw/system/Status');

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Constants = require('*/cartridge/scripts/util/hipayConstants');

/**
 * Delete attempts that are more than 24 hours old
 *
 * @param {*} options
 * @param {dw.job.JobStepExecution} jobStepExecution - Job Step Execution
 * @return {dw.system.Status} Job step execution status
 */
function cleanSaveOneclick(options, jobStepExecution) {
    Logger.info('step-job stepCleanSaveOneclick : start of treatment');
    try {
        var listAttempts;
        var deletedNumber = 0;
        var failedNumber = 0;
        var lastDay = new Date();
        lastDay.setDate(lastDay.getDate() - 1);

        listAttempts = CustomObjectMgr.queryCustomObjects(Constants.OBJ_SAVE_ONE_CLICK, 'custom.attemptDate < {0}', 'custom.attemptDate desc', lastDay);

        if (listAttempts && listAttempts.getCount() > 0) {
            Logger.info('[The number of attempts that are more than 24 hours old : {0} ]', listAttempts.getCount());
            while (listAttempts.hasNext()) {
                var currentAttemptObj = listAttempts.next();
                if (currentAttemptObj) {
                    CustomObjectMgr.remove(currentAttemptObj);
                    deletedNumber++;
                }
            }

            if (deletedNumber > 0) {
                Logger.info('[The number of attempts that have been deleted : {0} ]', deletedNumber);
            }

            failedNumber = listAttempts.getCount() - deletedNumber;
            if (failedNumber > 0) {
                Logger.warn('### The number of attempts that have failed to remove : {0} ###', failedNumber);
            }
        } else {
            Logger.info('###### NO attempts found that have more than 24 hours ######');
        }
    } catch (e) {
        Logger.error('[stepCleanSaveOneclick.js] crashed on line: ' + e.lineNumber + ' with error: ' + e);
        return new Status(Status.ERROR);
    }

    Logger.info('step-job stepCleanSaveOneclick : end with OK');
    return new Status(Status.OK);
}

exports.execute = cleanSaveOneclick;
