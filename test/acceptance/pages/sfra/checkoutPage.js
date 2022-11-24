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
        // I.click('.nav-item[data-method-id="HIPAY_CREDIT_CARD"] .nav-link');
        // tryTo(() => I.click('.user-payment-instruments .add-payment'));
        // I.fillField('.phone', config.user.phone);
        // I.fillField('#cardNumber', card.cardNumber);
        // tryTo(() => I.moveCursorTo('.tooltip', 5, 5));
        // I.moveCursorTo('#cardNumber', 5, 5);
        // tryTo(() => I.moveCursorTo('.tooltip', 5, 5));
        // I.moveCursorTo('#cardNumber', 5, 5);
        // I.selectOption('#expirationMonth', card.expMonth);
        // I.selectOption('#expirationYear', card.expYear);
        // I.fillField('#securityCode', card.cvc);
        // I.fillField('input[name="dwfrm_billing_creditCardFields_phone"]', config.user.phone);
        // I.fillField('input[name="dwfrm_billing_contactInfoFields_email"]', config.user.email);
        // I.seeElement('#submit-button');
        // I.click('#submit-button');

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
    },

    // selectAndSubmitHiPayGriopayForm() {
    //     I.click('.nav-item[data-method-id="HIPAY_GIROPAY"] .nav-link');
    //     I.seeElement('input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]');
    //     I.fillField('input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]', config.giropay.code);
    //     I.seeElement('.submit-payment');
    //     I.click('.submit-payment');
    // },

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

    validateSecure() {
        I.wait(1);
        I.seeElement('#continue-transaction');
        I.click('#continue-transaction');
        I.wait(1);
    },

    placeOrderWithSecure(secure) {
        if (secure) {
            this.validateSecure();
        }
        I.see(Resource.msg('thanks'));
    },

    selectPaymentMethod(paymentMethodId) {
        I.click('li[data-method-id="' + paymentMethodId + '"');
        I.click('.submit-payment');
        I.click('.place-order');
    },

    validateHostedSofortPayment() {
        I.seeElement('.cookie-modal-accept-all');
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

    switchToHipayIframe() {
        I.switchTo('#hipay-iframe');
    },

    submitHipayForm() {
        I.click('#submit-button');
    },

    validateHostedSisalPayment() {
        I.click('#submit-button');
    },

    leaveHipayIframe() {
        I.switchTo();
    },
}
