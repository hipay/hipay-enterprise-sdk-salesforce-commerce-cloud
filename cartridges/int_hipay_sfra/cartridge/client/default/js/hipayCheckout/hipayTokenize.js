'use strict'

var cardInstance = require('./hipayCreateCard').cardInstance;
var idealInstance = require('./hipayCreateIdeal').idealInstance;
var giropayInstance = require('./hipayCreateGiropay').giropayInstance;

/* Add event listener on the submit button when clicked */
$('.submit-payment-hipay').on('click', function () {
    var selectedPaymentMethod = $('.nav-link.active').parent().data('method-id');

    if (selectedPaymentMethod === 'HIPAY_CREDIT_CARD') {
        getPaymentData(cardInstance);

    } else if (selectedPaymentMethod === 'HIPAY_IDEAL') {
        getPaymentData(idealInstance);

    } else if (selectedPaymentMethod === 'HIPAY_GIROPAY') {
        getPaymentData(giropayInstance);
    }
});

function getPaymentData(instance) {
    /* Tokenize your card information when the submit button is clicked */
    instance.getPaymentData().then(
        function(response) {
            console.log(response);
            $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(response));

            $('button[value="submit-payment"]').trigger('click');
        },
        function(errors) {
            /* Display first error */
            document.getElementById("hipay-error-message").innerHTML = errors[0].error;
        }
    );
}
