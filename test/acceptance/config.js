'use strict';

module.exports = {
    storefront: {
        sfra: {
            url: 'https://zzye-001.sandbox.us01.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArchGlobal-Site',
        },
        siteg: {
            url: 'https://zzye-001.sandbox.us03.dx.commercecloud.salesforce.com/on/demandware.store/Sites-SiteGenesisGlobal-Site',
        }
    },
    currentLocale: 'fr_FR',
    product: {
        name: 'Pantalon droit',
        size: '30',
        quantity: '2'
    },
    user: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '06 20 00 00 02',
        email: 'compte@yopmail.com',
        password: 'Passw0rd1!'
    },
    adress: {
        address1: '40 rue des Tours',
        country: 'France',
        state: 'Lille',
        city: 'Lille',
        zipCode: '59000'
    },
    creditCard: {
        cardNumber: '4111111111111111',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    creditCard3DS: {
        cardNumber: '4000000000000002',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    creditCard3DSV2: {
        cardNumber: '4874970686672022',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    masterCard: {
        cardNumber: '5404000000000001',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    masterCard3DS: {
        cardNumber: '5454545454545454',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    masterCard3DSV2: {
        cardNumber: '5130257474533310',
        expMonth: '12',
        expYear: '2023',
        cvc: '123'
    },
    giropay: {
        code: 'TESTDETT421',
        redirectUrl: 'https://ftg-customer-integration.giropay.de/',
        account: 'chiptanscatest2',
        PIN: '12345',
        TAN: '123456'
    },
    iDEAL: {
        BIC: 'Testbank',
        TAN: '1234'
    },
    sofort: {
        bank: 'Demo Bank',
        id: '00000',
        password: '123456789',
        confirmCode: '12345'
    }
};
