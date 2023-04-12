'use strict';

let Constants = {};

Constants.OPERATION_CODE_SALE                   = 'SALE';

Constants.PAYMENT_URL_PREFIX                    = 'https://payment.';

// SFCC Payment method constants
Constants.PAYMENT_METHOD_PREFIX                 = 'INGENICO_OGONE';
Constants.PAYMENT_METHOD_CARD                   = Constants.PAYMENT_METHOD_PREFIX + '_CARD';
Constants.PAYMENT_METHOD_REDIRECT               = Constants.PAYMENT_METHOD_PREFIX + '_REDIRECT';

Constants.PAYMENT_PROCESSOR_PREFIX             = 'INGENICO_OGONE';
Constants.PAYMENT_PROCESSOR_CREDIT             = Constants.PAYMENT_PROCESSOR_PREFIX + '_CREDIT';
Constants.PAYMENT_PROCESSOR_REDIRECT           = Constants.PAYMENT_PROCESSOR_PREFIX + '_REDIRECT';

// Ingenico Ogone Payment Product Constants
Constants.PAYMENT_PRODUCT_GROUP_CARD            = 'card';
Constants.PAYMENT_PRODUCT_GROUP_REDIRECT        = 'redirect';
Constants.PAYMENT_PRODUCT_GROUP_MOBILE          = 'mobile';
Constants.PAYMENT_PRODUCT_BANCONTACT_ID         = 3012;
Constants.PAYMENT_PRODUCT_IDEAL_ID              = 809;

Constants.CHECKOUT_TYPE_HOSTED_PAGE             = 1;
Constants.CHECKOUT_TYPE_TOKENIZATION            = 2;

Constants.HOSTED_CHECKOUT_RETURN_CONTROLLER     = 'IngenicoOgone-HCPReturn';
Constants.HOSTED_TOKENIZATION_RETURN_CONTROLLER = 'IngenicoOgone-HTPReturn';

Constants.REJECTED_PAYMENT_STATUS_CATEGORY      = 'REJECTED';
Constants.REJECTED_PAYMENT_STATUSES             = ['CREATED', 'CANCELLED', 'REJECTED', 'REJECTED_CAPTURE'];
Constants.UNKNOWN_PAYMENT_STATUS_CATEGORY       = 'PENDING';
Constants.UNKNOWN_PAYMENT_STATUSES              = ['REDIRECTED', 'PENDING_PAYMENT', 'AUTHORIZATION_REQUESTED', 'CAPTURE_REQUESTED'];
Constants.AUTHORIZED_PAYMENT_STATUS_CATEGORY    = 'AUTHORIZED';
Constants.SUCCESSFUL_PAYMENT_STATUSES           = ['PENDING_COMPLETION', 'PENDING_CAPTURE'];
Constants.CANCELLED_PAYMENT_STATUS_CATEGORY     = 'CANCELLED';
Constants.COMPLETED_PAYMENT_STATUS_CATEGORY     = 'COMPLETED';
Constants.CAPTURED_PAYMENT_STATUS               = 'CAPTURED';
Constants.COMPLETED_PAYMENT_STATUSES            = ['CAPTURED'];

Constants.ABANDONED_PAYMENT_STATUSES            = ['CREATED', 'REDIRECTED'];
Constants.VALID_CAPTURE_STATUSES                = ['CAPTURED', 'CAPTURE_REQUESTED'];
Constants.VALID_REFUND_STATUSES                 = ['REFUNDED', 'REFUND_REQUESTED'];
Constants.PENDING_CAPTURE_STATUSES              = ['CAPTURE_REQUESTED'];

Constants.TOKEN_CREATED                         = 'CREATED';
Constants.TOKEN_UPDATED                         = 'UPDATED';
Constants.TOKEN_UNCHANGED                       = 'UNCHANGED';

module.exports = Constants;
/* eslint no-multi-spaces: "off" */
