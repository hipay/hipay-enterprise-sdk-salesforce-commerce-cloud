'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');

module.exports = {
    fields: {
        firstName: '#shippingFirstNamedefault',
        lastName: '#shippingLastNamedefault',
        adress1: '#shippingAddressOnedefault',
        country: '#shippingCountrydefault',
        state: '#shippingStatedefault',
        city: '#shippingAddressCitydefault',
        zipcode: '#shippingZipCodedefault',
        phone: '#shippingPhoneNumberdefault'
      },

    initCheckout() {
        this.goToMenCategory();
        this.addProductToCart();
        this.goToCart();
        this.goToCheckout();
        I.see(Resource.msg('checkout'));
    },

    goToTopSellerCategory() {
        I.click('#top-seller');
    },

    goToMenCategory() {
        I.moveCursorTo('.dropdown-toggle#mens');
        I.click('#mens-clothing');
    },

    addProductToCart() {
        I.click(locate('.pdp-link .link').withText(config.product.name));
        tryTo(() => I.click(locate('.color-attribute .selectable').first()));
        I.selectOption('#size-1', config.product.size);
        I.selectOption('#quantity-1', config.product.quantity);
        I.click('.add-to-cart');
    },

    goToCart() {
        I.click('a.minicart-link');
        I.see(Resource.msg('yourCart'));
    },

    goToCheckout() {
        I.click('.btn.btn-primary.btn-block.checkout-btn');
    },

    submitCheckout() {
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.selectOption(this.fields.country, config.adress.country);
        tryTo(() => I.selectOption(this.fields.state, config.adress.state));
        I.fillField(this.fields.city, config.adress.city);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.fillField(this.fields.phone, config.user.phone.replace(/\s/g, ''));
        I.seeElement('.submit-shipping');
        I.click('.submit-shipping');
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';
        I.click('.nav-item[data-method-id="HIPAY_CREDIT_CARD"] .nav-link');
        tryTo(() => I.click('.user-payment-instruments .add-payment'));
        I.fillField('.phone', config.user.phone);
        I.fillField('#cardNumber', card.cardNumber);
        tryTo(() => I.moveCursorTo('.tooltip', 5, 5));
        I.moveCursorTo('#cardNumber', 5, 5);
        tryTo(() => I.moveCursorTo('.tooltip', 5, 5));
        I.moveCursorTo('#cardNumber', 5, 5);
        I.selectOption('#expirationMonth', card.expMonth);
        I.selectOption('#expirationYear', card.expYear);
        I.fillField('#securityCode', card.cvc);
        I.fillField('input[name="dwfrm_billing_creditCardFields_phone"]', config.user.phone);
        I.seeElement('.submit-payment');
        I.click('.submit-payment');
    },

    selectAndSubmitHiPayGriopayForm() {
        I.click('.nav-item[data-method-id="HIPAY_GIROPAY"] .nav-link');
        I.seeElement('input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]');
        I.fillField('input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]', config.giropay.code);
        I.seeElement('.submit-payment');
        I.click('.submit-payment');
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

    placeOrder() {
        I.seeElement('.place-order');
        I.click('.place-order');
    },

    validateSecure() {
        I.wait(1);
        I.seeElement('#continue-transaction');
        I.click('#continue-transaction');
        I.wait(1);
    },

    placeOrderWithSecure(secure) {
        this.placeOrder();
        if (secure) {
            this.validateSecure();
        }
        I.see(Resource.msg('thanks'));
    }
}
