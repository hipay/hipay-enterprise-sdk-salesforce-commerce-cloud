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
            phone: '#phoneNumber',
            giropay: 'input[name="dwfrm_billing_hipayMethodsFields_giropay_bic"]'
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
        I.waitForInvisible('.veil', 5);
        I.selectOption('#size-1', config.product.size);
        I.waitForInvisible('.veil', 5);
        I.selectOption('#quantity-1', config.product.quantity);
        I.waitForInvisible('.veil', 5);
        I.click('.add-to-cart');
        I.waitForInvisible('.veil', 5);
    },

    goToCart() {
        I.click('a.minicart-link');
        I.waitForNavigation();
        I.see(Resource.msg('yourCart'));
    },

    goToCheckout() {
        I.click('.btn.btn-primary.btn-block.checkout-btn');
        I.waitForNavigation();
    },

    selectPaymentMethod(paymentMethodId) {
        I.waitForVisible('li[data-method-id="' + paymentMethodId + '"]', 10);
        I.click('li[data-method-id="' + paymentMethodId + '"]');
    },

    submitShipping() {
        I.waitForVisible(this.fields.firstName);
        I.fillField(this.fields.firstName, config.user.firstName);
        I.waitForVisible(this.fields.lastName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.waitForVisible(this.fields.adress1);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.selectOption(this.fields.country, config.adress.country);
        I.waitForVisible(this.fields.city);
        I.fillField(this.fields.city, config.adress.city);
        I.waitForVisible(this.fields.zipcode);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.waitForVisible(this.fields.phone);
        I.fillField(this.fields.phone, config.user.phone.replace(/\s/g, ''));
        I.seeElement('.submit-shipping');
        I.click('.submit-shipping');
        I.waitForVisible('.submit-payment', 5);
    },

    submitPayment() {
        I.click('.submit-payment');
        I.waitForVisible('.place-order', 5);
    },

    placeOrder() {
        I.click('.place-order');
        I.waitForNavigation();
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

        I.fillField(this.fields.billing.phone, config.user.phone);

        I.fillField('input[id="cardNumber"]', card.cardNumber);
        I.selectOption('#expirationMonth', card.expMonth);
        I.selectOption('#expirationYear', card.expYear);
        I.fillField('#securityCode', card.cvc);

        this.submitPayment();
        this.placeOrder();
    },

    selectAndSubmitHiPayGriopayForm() {
        I.fillField(this.fields.billing.giropay, config.giropay.code);
        this.submitPayment();
        this.placeOrder();
    },

    validateIdealForm() {
        I.fillField('select[name="dwfrm_billing_hipayMethodsFields_ideal_issuer__bank__id"]', 'SNSBNL2A')
        this.submitPayment();
        this.placeOrder();
    },

    validateSecure() {
        I.waitForNavigation();
        I.waitInUrl('/challenge');
        I.waitForVisible('#continue-transaction', 15);
        I.click('#continue-transaction');
        I.waitForNavigation();
    },

    placeOrderWithSecure(secure) {
        if (secure) {
            this.validateSecure();
        }
        I.waitForText(Resource.msg('thanks'), 10);
    },

    selectHostedPaymentMethod(paymentMethodId) {
        this.selectPaymentMethod(paymentMethodId);
        this.submitPayment();
        this.placeOrder();
    },

    switchToHipayIframe() {
        I.waitForVisible('#hipay-iframe', 10);
        I.switchTo('#hipay-iframe');
    },

    leaveHipayIframe() {
        I.switchTo();
    },
}
