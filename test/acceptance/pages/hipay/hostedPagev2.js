'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');

module.exports = {
    fields: {
        firstName: '#dwfrm_singleshipping_shippingAddress_addressFields_firstName',
        lastName: '#dwfrm_singleshipping_shippingAddress_addressFields_lastName',
        adress1: '#dwfrm_singleshipping_shippingAddress_addressFields_address1',
        country: '#dwfrm_singleshipping_shippingAddress_addressFields_country',
        state: '#dwfrm_singleshipping_shippingAddress_addressFields_state',
        city: '#dwfrm_singleshipping_shippingAddress_addressFields_city',
        zipcode: '#dwfrm_singleshipping_shippingAddress_addressFields_postal',
        phone: '#dwfrm_singleshipping_shippingAddress_addressFields_phone',
        useAsBillingAddress: '#dwfrm_singleshipping_shippingAddress_useAsBillingAddress'
    },

    fillAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

        I.waitForVisible('#hipay-card-field-cardNumber>iframe', 10);
        I.waitForVisible('#hipay-card-field-cardHolder>iframe', 5);
        I.waitForVisible('#hipay-card-field-expiryDate>iframe', 5);
        I.waitForVisible('#hipay-card-field-cvc>iframe', 5);

        I.switchTo('#hipay-card-field-cardNumber>iframe');
        I.fillField('input[name="cardnumber"]', card.cardNumber);
        I.switchTo();

        I.switchTo('#hipay-card-field-cardHolder>iframe');
        I.fillField('input[name="ccname"]', [config.user.firstName, config.user.lastName].join(' '));
        I.switchTo();

        I.switchTo('#hipay-card-field-expiryDate>iframe');
        I.fillField('input[name="cc-exp"]', card.expMonth + '/' + card.expYear.slice(-2));
        I.switchTo();

        I.switchTo('#hipay-card-field-cvc>iframe');
        I.fillField('input[name="cvc"]', card.cvc);
        I.switchTo();

        I.click('button[aria-label="pay-button"]');

        I.waitForNavigation();
    },

    submitHipayForm() {
        //I.click('#submit-button');
        I.waitForVisible('button[aria-label="pay-button"]');
        I.click('button[aria-label="pay-button"]');
    },

    fillAndSubmitHiPayGriopayForm() {
        I.waitForVisible('#hipay-giropay-field-issuer_bank_id>iframe', 10);

        I.switchTo('#hipay-giropay-field-issuer_bank_id>iframe');
        I.waitForVisible('input[name="bic"]', 10);
        I.fillField('input[name="bic"]', config.giropay.code);
        I.switchTo();

        I.click('button[aria-label="pay-button"]');

        I.waitForNavigation();
    },

    validateGiroPayPayment() {
        I.waitInUrl('giropay');
        I.fillField('input[name="account/addition[@name=benutzerkennung]"]', config.giropay.account);
        I.fillField('input[name="ticket/pin"]', config.giropay.PIN);
        I.pressKey('Enter');
        I.checkOption('input[name="aumethod"]');
        I.pressKey('Enter');
        I.fillField('input[name="ticket/tan"]', config.giropay.TAN);
        I.pressKey('Enter');
        I.click('.btn-primary[name="weiterButton"]');
        I.fillField('input[name="ticket/tan"]', config.giropay.TAN);
        I.pressKey('Enter');
    },

    fillAndSubmitHiPayiDEALForm() {
        I.waitForVisible('#hipay-ideal-field-issuer_bank_id>iframe', 10);

        I.switchTo('#hipay-ideal-field-issuer_bank_id>iframe');
        I.waitForVisible('input[name="issuer_bank_id"]', 10);
        I.switchTo();

        I.click('button[aria-label="pay-button"]');

        I.waitForNavigation();
    },

    validateiDEALPayment() {
        //I.waitForNavigation();
        // https://r3.girogate.de/ti/simideal?...
        I.waitInUrl('simideal');
        I.waitForVisible('input[name="bic"]', 10);
        I.fillField('input[name="bic"]', config.ideal.BIC);
        I.click('.btn-primary');
        I.click('.btn-primary');
        I.fillField('input[name="tan"]', config.ideal.TAN);
        I.click('.btn-primary');
        I.click('.btn-primary');
    },

    validateMooneyPayment() {
        I.waitForNavigation()
        // https://stage-secure-gateway.hipay-tpp.com/provider/sisal/display-reference/...
        I.waitInUrl('sisal');
        I.waitForVisible('#submit-button');
        I.click('#submit-button');
        I.waitForNavigation();
    },

    validateHostedSofortPayment() {
        I.click('.cookie-modal-accept-all');
        I.fillField('#SenderBank', config.sofort.bank);
        I.click('.button-right');
        I.fillField('#BackendFormLOGINNAMEUSERID', config.sofort.id);
        I.fillField('#BackendFormUSERPIN', config.sofort.password);
        I.click('.button-right');
        I.click('.button-right');
        I.fillField('#BackendFormTAN', config.sofort.confirmCode);
        I.click('.button-right');
    }
}
