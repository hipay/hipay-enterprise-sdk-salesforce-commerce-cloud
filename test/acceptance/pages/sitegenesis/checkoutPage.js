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

    initCheckout() {
        this.goToMenCategory();
        this.addProductToCart();
        this.goToCart();
        this.goToCheckout();
    },

    goToTopSellerCategory() {
        I.click('#top-seller');
    },

    goToMenCategory() {
        I.click('.primary-logo');
    },

    addProductToCart() {
        I.click('.product-image');
        tryTo(() => I.click(locate('.size .selectable').first()));
        I.click('#add-to-cart');
    },

    goToCart() {
        I.click('a.mini-cart-link');
    },

    goToCheckout() {
        I.click(locate('button').withAttr({name: 'dwfrm_cart_checkoutCart'}));
    },

    selectPaymentMethod(paymentMethodId) {
        I.checkOption('#is-' + paymentMethodId);
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    switchToHipayIframe() {
        I.switchTo('#hipay-iframe');
    },

    leaveHipayIframe() {
        I.switchTo();
    },

    submitCheckout() {
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.fillField(this.fields.city, config.adress.city);
        I.selectOption(this.fields.country, config.adress.country);
        I.fillField(this.fields.phone, config.user.phone);
        tryTo(() => I.selectOption(this.fields.state, config.adress.state));
        I.checkOption(this.fields.useAsBillingAddress);
        I.click('.button-fancy-large');
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

//        I.switchTo('#hipay-iframe');

        I.click('#cardNumber');
        I.fillField('input[name="cardNumber"]', card.cardNumber);
        // I.switchTo();

        I.click('#cardHolder');
        I.fillField('input[name="cardHolder"]', `${config.user.firstName} ${config.user.lastName}`);
        // I.switchTo();

        I.click('#cardExpiryMonth');
        I.click('option[value="12"]');

        I.click('#cardExpiryYear');
        I.click('option[value="2030"]');

        I.click('#cardSecurityCode');
        I.fillField('input[name="cardSecurityCode"]', card.cvc);
        // I.switchTo();

        I.click('#submit-button');

        // New Hosted Page.
        // I.wait(2);

        // I.switchTo('#hipay-card-field-cardNumber>iframe');
        // I.fillField('input[name="cardnumber"]', card.cardNumber);
        // I.switchTo();

        // I.wait(3);

        // I.switchTo('#hipay-card-field-cardHolder>iframe');
        // I.fillField('input[name="ccname"]', `${config.user.firstName} ${config.user.lastName}`);
        // I.switchTo();

        // I.wait(2);

        // I.switchTo('#hipay-card-field-expiryDate>iframe');
        // I.fillField('input[name="cc-exp"]', `${card.expMonth}/${card.expYear.slice(-2)}`);
        // I.switchTo();

        // I.wait(5);

        // I.switchTo('#hipay-card-field-cvc>iframe');
        // I.fillField('input[name="cvc"]', card.cvc);
        // I.switchTo();

        // I.wait(1);

        // I.click('button[aria-label="pay-button"]');
    },

    selectAndSubmitHiPayGriopayForm() {
        I.fillField('#issuer_bank_id', config.giropay.code);
        I.seeElement('.submit-button');
        I.click('#submit-button');
    },

    validateGiroPayPayment() {
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

    validateiDEALPayment() {
        I.fillField('input[name="bic"]', config.iDEAL.BIC);
        I.click('.btn-primary');
        I.click('.btn-primary');
        I.fillField('input[name="tan"]', config.iDEAL.TAN);
        I.click('.btn-primary');
        I.click('.btn-primary');
    },

    submitHipayForm() {
        I.click('#submit-button');
    },

    validateHostedSisalPayment() {
        I.click('#submit-button');
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
    },

    validateHipayHostedCreditCard() {

    },

    validateSecure() {
        I.wait(1);
        I.seeElement('#continue-transaction');
        I.click('#continue-transaction');
        I.wait(1);
    },

    placeOrderWithSecure(secure) {
//        I.switchTo();
        if (secure) {
            this.validateSecure();
        }
        I.see(Resource.msg('thanks'));
    }
}
