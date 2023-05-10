'use strict';

(function () {

    var hipay = HiPay({
        username: '94693232.stage-secure-gateway.hipay-tpp.com',
        password: 'Test_qFjxCqVtSIugffvfWwSRHITA',
        environment: 'stage',
        lang: 'fr'
    });

    var browserInfo = hipay.getBrowserInfo();
    $("#browserInfo").val(JSON.stringify(browserInfo));


    var config = {
        template: 'auto',
        selector: 'hipay-hostedfields-form',
        styles: {
          base: {
            // default field styling
            color: '#000000',
            fontSize: '15px',
            fontWeight: 400,
            placeholderColor: '#999999',
            iconColor: '#00ADE9',
            caretColor: '#00ADE9'
          },
          invalid: {
            // invalid field styling
            color: '#D50000',
            caretColor: '#D50000'
          }
        }
    };
    var cardInstance = hipay.create('card', config);

    cardInstance.on('change', function (event) {
        // Display error(s)
        document.getElementById("hipay-error-message").innerHTML = event.error;
    });


    function initialize() {

        $('.button-fancy-large').addClass('d-none');
        var newButton = $('<div>').addClass('button-fancy-large hipay-submit-payment').text('VALIDER LA COMMANDE');
        $('.button-fancy-large').after(newButton);

        $('.hipay-submit-payment').on('click', function() {
            cardInstance.getPaymentData().then(function (response) {
                /* Send token to your server to process payment */
                $('input[name=dwfrm_billing_paymentMethods_hipayTokenize]').val(JSON.stringify(response));
                $('button[name=dwfrm_billing_save]').trigger('click');
            }, function (errors) {
                /* Display first error */
                document.getElementById("hipay-error-message").innerHTML = errors[0].error;
            });
        });
    };

    $('body').ready(function () {
        initialize();
    });

}());
