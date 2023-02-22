'use strict'

function getGlobalVariable() {
    return HiPay({
        username: 'public',
        password: 'password',
        environment: "stage",
        lang: "fr"
    });
}

module.exports = {
    getGlobalVariable: getGlobalVariable
}