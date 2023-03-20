'use strict'

function getGlobalVariable() {

    if (window.hipayCustomPreferences.length === 0) {
        return false;
    }
          
    var customPreferences = window.hipayCustomPreferences[0];
    return HiPay(customPreferences.globalVariable);
}

module.exports = {
    getGlobalVariable: getGlobalVariable
}
