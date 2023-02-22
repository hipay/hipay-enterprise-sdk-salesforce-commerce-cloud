'use strict'

var hipay = require('./globalVariable').getGlobalVariable();

var config = {
    fields: {
        cardHolder: {
            selector: 'hipay-card-holder' // card holder div id
        },
        cardNumber: {
            selector: 'hipay-card-number' // card number div id
        },
        expiryDate: {
            selector: 'hipay-expiry-date' // expiry date div id
        },
        cvc: {
            selector: 'hipay-cvc', // cvc div id
            helpButton: true // activate the help button
        }
    },
    styles: {
        base: { // default field styling
          color: "#000000",
          fontSize: "15px",
          fontWeight: 400,
          placeholderColor: "#999999",
          iconColor: '#00ADE9',
          caretColor: "#00ADE9"
        },
        invalid: { // invalid field styling
          color: '#D50000',
          caretColor: '#D50000'
        }
    }
};

var cardInstance = hipay.create('card', config);

/* Listen to change event on card instance */
cardInstance.on('change', function(event){
    /* Display error(s), if any */
    document.getElementById("hipay-error-message").innerHTML = event.error;
    /* Enable / disable submit button */
    document.getElementById("hipay-submit-button").disabled = !event.valid;
});