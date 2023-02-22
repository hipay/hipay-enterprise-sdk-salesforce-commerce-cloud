'use strict'

var hipay = require('./globalVariable').getGlobalVariable();

var options = {
    template: 'auto',
    selector: 'card',
    multi_use: true,
    fields: {
        cardHolder: {
            uppercase: true,
            placeholder: 'John Doe'
        },
        cvc: {
            helpButton: true
        }
    },
    styles: {
        base: {
          color: "#000000",
          fontSize: "15px",
          fontFamily: "Roboto",
          fontWeight: 400,
          placeholderColor: "#999999",
          iconColor: '#00ADE9',
          caretColor: "#00ADE9"
        },
        invalid: {
          color: '#D50000',
          caretColor: '#D50000'
        }
    }
}
var cardInstance = hipay.create('card', options);