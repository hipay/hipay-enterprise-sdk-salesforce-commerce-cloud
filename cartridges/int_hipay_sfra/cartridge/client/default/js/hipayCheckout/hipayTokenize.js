'use strict'

/* Get the form */
let cardForm = $('#hipay-form');

/* Add event listener on the submit button when clicked */
cardForm.on('submit', function(event) {
  event.preventDefault();
  /* Tokenize your card information when the submit button is clicked */
  cardInstance.getPaymentData().then(
    function(response) {
      /* Send token to your server to process payment */
      handlePayment(response.token);
    },
    function(errors) {
      /* Display first error */
      document.getElementById("hipay-error-message").innerHTML = errors[0].error;
    }
  );
});