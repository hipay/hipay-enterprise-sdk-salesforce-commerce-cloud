'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');
const pageUrl = `${config.storefront.sfra.url}/${config.currentLocale}`;

module.exports = {
    fields: {
        loginEmail: '#login-form-email',
        loginPassword: '#login-form-password',
        firstName: '#registration-form-fname',
        lastName: '#registration-form-lname',
        phone: '#registration-form-phone',
        email: '#registration-form-email',
        confirmEmail: '#registration-form-email-confirm',
        password: '#registration-form-password',
        confirmPassword: '#registration-form-password-confirm'
    },

    async loginOrCreateAccount() {
        I.amOnPage(pageUrl)
        this.confirmTrackingConsent();
        I.click('a[aria-label="Login to your account"]');
        const iAmLogged = await tryTo(() => this.loginAccount());
        if (!iAmLogged) {
            this.createAccout();
        }
    },

    createAccout() {
        I.click('.nav-link[href="#register"]');
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.phone, config.user.phone.replace(/\s/g, ''));
        I.fillField(this.fields.email, config.user.email);
        I.fillField(this.fields.confirmEmail, config.user.email);
        I.fillField(this.fields.password, config.user.password);
        I.fillField(this.fields.confirmPassword, config.user.password);
        I.click(locate('button').withText(Resource.msg('createAccount')));
        I.see(Resource.msg('dashboard'));
    },

    loginAccount() {
        I.click('.nav-link[href="#login"]');
        I.fillField(this.fields.loginEmail, config.user.email);
        I.fillField(this.fields.loginPassword, config.user.password);
        I.click(locate('button').withText(Resource.msg('login')));
        I.see(Resource.msg('dashboard'));
    },

    confirmTrackingConsent() {
        tryTo(() => I.click('.affirm'));
    },
};
