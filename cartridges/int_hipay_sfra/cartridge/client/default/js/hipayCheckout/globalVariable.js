'use strict'

function getGlobalVariable() {
    if (window.hipayCustomPreferences.length === 0) {
        return false;
    }

    return HiPay(window.hipayCustomPreferences.globalVariable);
}

module.exports = {
    getGlobalVariable: getGlobalVariable
}
