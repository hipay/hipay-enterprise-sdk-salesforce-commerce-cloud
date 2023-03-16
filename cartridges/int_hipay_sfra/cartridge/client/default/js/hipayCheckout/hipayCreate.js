'use strict'

var hipay = require('./globalVariable').getGlobalVariable();

    var config = {
        template: 'auto',
        selector: 'hipay-hostedfields-form', // form container div id
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
      $("#hipay-error-message").innerHTML = event.error;
      /* Enable / disable submit button */
      $('button[value=submit-payment]').disabled = !event.valid;
    });

  module.exports = {
    cardInstance: cardInstance
  }