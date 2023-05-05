'use strict';

$(document).ready(function() {
    var hipay = HiPay({
        username: '94693232.stage-secure-gateway.hipay-tpp.com',
        password: 'Test_qFjxCqVtSIugffvfWwSRHITA',
        environment: 'stage',
        lang: 'fr'
    });

    let browserInfo = hipay.getBrowserInfo();
    $("#browserInfo").val(JSON.stringify(browserInfo));
});