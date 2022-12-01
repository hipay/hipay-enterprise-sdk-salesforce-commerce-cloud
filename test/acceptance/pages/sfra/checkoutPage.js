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
        phone: '#shippingPhoneNumberdefault',
        billing: {
            phone: '#phoneNumber'
        }
    },

    initCheckout() {
        this.goToMenCategory();
        this.addProductToCart();
        this.goToCart();
        this.goToCheckout();
    },

    goToTopSellerCategory() {
        I.click('#top-seller');
        I.waitForNavigation();
    },

    goToMenCategory() {
        I.moveCursorTo('.dropdown-toggle#mens');
        I.click('#mens-clothing');
        I.waitForNavigation();
    },

    addProductToCart() {
        I.click(locate('.pdp-link .link').withText(config.product.name));
        I.waitForNavigation();
        //tryTo(() => I.click(locate('.color-attribute .selectable').first()))
        I.click('.color-attribute .selectable');
        I.waitForInvisible('.veil');
        I.selectOption('#size-1', config.product.size);
        I.waitForInvisible('.veil');
        I.selectOption('#quantity-1', config.product.quantity);
        I.waitForInvisible('.veil');
        I.click('.add-to-cart');
        I.waitForInvisible('.veil');
    },

    goToCart() {
        I.click('a.minicart-link');
        I.waitForNavigation();
        I.see(Resource.msg('yourCart'));
    },

    goToCheckout() {
        I.click('.btn.btn-primary.btn-block.checkout-btn');
        I.waitForNavigation();
        //I.waitForText(Resource.msg('checkout'));

    },


    submitCheckout() {
        I.waitForVisible(this.fields.firstName);
        I.fillField(this.fields.firstName, config.user.firstName);
        I.waitForVisible(this.fields.lastName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.waitForVisible(this.fields.adress1);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.selectOption(this.fields.country, config.adress.country);
        //tryTo(() => I.selectOption(this.fields.state, config.adress.state));
        I.waitForVisible(this.fields.city);
        I.fillField(this.fields.city, config.adress.city);
        I.waitForVisible(this.fields.zipcode);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.waitForVisible(this.fields.phone);
        I.fillField(this.fields.phone, config.user.phone.replace(/\s/g, ''));
        I.seeElement('.submit-shipping');
        I.click('.submit-shipping');
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

        I.fillField(this.fields.billing.phone, config.user.phone);

        I.fillField('input[id="cardNumber"]', card.cardNumber);
        I.selectOption('#expirationMonth', card.expMonth);
        I.selectOption('#expirationYear', card.expYear);
        I.fillField('#securityCode', card.cvc);
        I.click('.submit-payment');
        I.waitForVisible('.place-order');
        I.click('.place-order');
        I.waitForNavigation();
    },

    selectAndSubmitHiPayGriopayForm(isApi) {
        if (isApi) {
            I.fillField('input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]', config.giropay.code);
            I.click('.submit-payment');
            I.click('.place-order');
        } else {
            I.fillField('#issuer_bank_id', config.giropay.code);
            I.seeElement('.submit-button');
            I.click('#submit-button');
        }
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

    validateIdealForm() {
        I.click('select[name="dwfrm_billing_hipayMethodsFields_ideal_issuer__bank__id"]');
        I.click('option[value="SNSBNL2A"]');
        I.click('.submit-payment');
        I.click('.place-order');
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
        I.waitForVisible('#continue-transaction');
        I.click('#continue-transaction');
        I.waitForNavigation();
    },

    placeOrderWithSecure(secure) {
        if (secure) {
            this.validateSecure();
        }
        I.waitForText(Resource.msg('thanks'), 10);
    },

    selectPaymentMethod(paymentMethodId) {
        I.click('li[data-method-id="' + paymentMethodId + '"]');
    },

    selectHostedPaymentMethod(paymentMethodId) {
        this.selectPaymentMethod(paymentMethodId);
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

    leaveHipayIframe() {
        I.switchTo();
    },
}
