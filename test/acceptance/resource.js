'use strict';

const config = require('./config');

module.exports = {
    fr_FR: {
        login: 'Connexion',
        createAccount: 'Créer un compte',
        submitShipping: 'Suivant : Paiement',
        dashboard: 'Tableau de bord',
        checkout: 'Règlement',
        yourCart: 'Votre panier',
        thanks: 'Merci pour votre commande.',
        apply: 'Appliquer'
    },
    en_GB: {
        login: 'Login',
        createAccount: 'Create Account',
        submitShipping: 'Next: Payment',
        dashboard: 'Dashboard',
        checkout: 'Checkout',
        yourCart: 'Your Cart',
        thanks: 'Thank you for your order.',
        apply: 'Apply'
    },
    msg(message) {
        return this[config.currentLocale || 'fr_FR'][message];
    }
};
