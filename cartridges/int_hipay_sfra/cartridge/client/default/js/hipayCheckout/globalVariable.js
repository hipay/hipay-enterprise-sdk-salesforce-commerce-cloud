'use strict'

function getGlobalVariable() {
    return HiPay({
        username: '94693232.stage-secure-gateway.hipay-tpp.com',
        password: 'Test_qFjxCqVtSIugffvfWwSRHITA',
        environment: "stage",
        lang: "fr"
    });
}

module.exports = {
    getGlobalVariable: getGlobalVariable
}