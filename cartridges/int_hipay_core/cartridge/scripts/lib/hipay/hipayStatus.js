'use strict';

/**
 * HiPayStatus object contains all status response types
 * Documentation : https://developer.hipay.com/payment-fundamentals/essentials/transaction-status
 */
var HiPayStatus = {
    // CUSTOM
    COMPLETED: {
        code: 'completed',
        value: 'COMPLETED'
    },
    FORWARDING: {
        code: 'forwarding',
        value: 'FORWARDING'
    },
    PENDING: {
        code: 'pending',
        paymentStatus: [112, 142, 177, 200],
        value: 'PENDING'
    },
    DECLINED: {
        code: 'declined',
        paymentStatus: [109, 110, 111, 113, 178],
        value: 'DECLINED'
    },
    ACCEPT: {
        code: 'accept',
        paymentStatus: [112, 116, 117, 118, 119, 142],
        value: 'ACCEPT'
    },
    CANCEL: {
        code: 'cancel',
        paymentStatus: [115],
        value: 'CANCEL'
    },
    REJECTED: {
        code: 'rejected',
        paymentStatus: ['113', '114', '115', '173'],
        value: 'REJECTED'
    },
    ERROR: {
        code: 'error',
        value: 'ERROR'
    },
    // Sent by server-to-server notification
    AUTHENTICATION_FAILED: {
        code: '109',
        value: 'Authentication Failed',
        description: 'The cardholder’s authentication failed.'
    },
    BLOCKED: {
        code: '110',
        value: 'Blocked',
        description: 'The transaction has been rejected for reasons of suspected fraud.'
    },
    DENIED: {
        code: '111',
        value: 'Denied',
        description: 'The merchant denied the payment attempt.'
    },
    AUTHORIZED_AND_PENDING: {
        code: '112',
        value: 'Authorized and Pending',
        description: 'The payment has been challenged by the fraud rule set and is pending.'
    },
    REFUSED: {
        code: '113',
        value: 'Refused',
        description: 'The financial institution refused to authorize the payment.'
    },
    EXPIRED: {
        code: '114',
        value: 'Expired',
        description: 'The validity period of the payment authorization has expired.'
    },
    CANCELLED: {
        code: '115',
        value: 'Cancelled',
        description: 'The merchant has cancelled the payment attempt.'
    },
    AUTHORIZED: {
        code: '116',
        value: 'Authorized',
        description: 'The financial institution has approved the payment.'
    },
    CAPTURE_REQUESTED: {
        code: '117',
        value: 'Capture Requested',
        description: 'A capture request has been sent to the financial institution.'
    },
    CAPTURED: {
        code: '118',
        value: 'Captured',
        description: 'The financial institution has processed the payment.'
    },
    PARTIALLY_CAPTURED: {
        code: '119',
        value: 'Partially Captured',
        description: 'The financial institution has processed part of the payment.'
    },
    REFUND_REQUESTED: {
        code: '124',
        value: 'Refund Requested',
        description: 'A refund request has been sent to the financial institution.'
    },
    REFUNDED: {
        code: '125',
        value: 'Refunded',
        description: 'The payment was refunded.'
    },
    PARTIALLY_REFUNDED: {
        code: '126',
        value: 'Partially Refunded',
        description: 'The payment was partially refunded.'
    },
    CHARGED_BACK: {
        code: '129',
        value: 'Charged Back',
        description: 'The payment was charged back.'
    },
    DISPUTE_LOST: {
        code: '134',
        value: 'Dispute Lost',
        description: 'The merchant lost the chargeback dispute.'
    },
    AUTHORIZATION_REQUESTED: {
        code: '142',
        value: 'Authorization Requested',
        description: 'The payment method used requires an authorization request; the request was sent and the system is waiting for the approval of the financial institution.'
    },
    AUTHORIZATION_CANCELLED: {
        code: '143',
        value: 'Authorization Cancelled',
        description: 'The authorization has been cancelled'
    },
    REFERENCE_RENDERED: {
        code: '144',
        value: 'Reference Rendered',
        description: 'The payment reference to pay has been generated'
    },
    REFUND_REFUSED: {
        code: '165',
        value: 'Refund Refused',
        description: 'The refund operation was refused by the financial institution.'
    },
    DEBITED_CARDHOLDER_CREDIT: {
        code: '166',
        value: 'Debited (cardholder credit)',
        description: 'The credit request was accepted and the cardholder was credited of the requested amount.'
    },
    CREDIT_REQUESTED: {
        code: '169',
        value: 'Credit Requested',
        description: 'The merchant requested to directly credit the cardholder.'
    },
    IN_PROGRESS: {
        code: '172',
        value: 'In progress',
        description: 'This status only applies to MixPayment master transactions. All of the master transaction’s sub-transactions are not yet authorized.'
    },
    CAPTURE_REFUSED: {
        code: '173',
        value: 'Capture Refused',
        description: 'The capture was refused by the financial institution.'
    },
    AWAITING_TERMINAL: {
        code: '174',
        value: 'Awaiting Terminal',
        description: 'The transaction request was sent to the payment terminal.'
    },
    AUTHORIZATION_CANCELLATION_REQUESTED: {
        code: '175',
        value: 'Authorization cancellation requested',
        description: 'The merchant requested to cancel the transaction’s authorization.'
    },
    CHALLENGE_REQUESTED: {
        code: '177',
        value: 'Challenge Requested',
        description: 'The payment method used requires authentication; authentication request has been sent and the system is waiting for an action from the customer.'
    },
    SOFT_DECLINED: {
        code: '178',
        value: 'Soft declined',
        description: 'The authorization was declined by the issuer because the transaction was not authenticated.'
    },
    PENDING_PAYMENT: {
        code: '200',
        value: 'Pending Payment',
        description: 'The transaction request was submitted to the acquirer but the response is not yet available.'
    },

    // Not sent by server-to-server notification
    CREATED: {
        code: '101',
        value: 'Created',
        description: 'The payment attempt was created.'
    },
    CARDHOLDER_ENROLLED: {
        code: '103',
        value: 'Cardholder Enrolled',
        description: 'The card is enrolled in the 3-D Secure program.'
    },
    CARDHOLDER_NOT_ENROLLED: {
        code: '104',
        value: 'Cardholder Not Enrolled',
        description: 'The card is not enrolled in the 3-D Secure program.'
    },
    UNABLE_TO_AUTHENTICATE: {
        code: '105',
        value: 'Unable to Authenticate',
        description: 'The card issuer is unable to complete the authentication request.'
    },
    CARDHOLDER_AUTHENTICATED: {
        code: '106',
        value: 'Cardholder Authenticated',
        description: 'The cardholder was successfully authenticated in the 3-D Secure program.'
    },
    AUTHENTICATION_ATTEMPTED: {
        code: '107',
        value: 'Authentication Attempted',
        description: 'The merchant has attempted to authenticate the cardholder in the 3-D Secure program.'
    },
    COULD_NOT_AUTHENTICATE: {
        code: '108',
        value: 'Could Not Authenticate',
        description: 'The card issuer is not able to complete the authentication request.'
    },
    COLLECTED: {
        code: '120',
        value: 'Collected',
        description: 'The funds have been made available for remittance to the merchant.'
    },
    PARTIALLY_COLLECTED: {
        code: '121',
        value: 'Partially Collected',
        description: 'A part of the transaction has been collected.'
    },
    SETTLED: {
        code: '122',
        value: 'Settled',
        description: 'The financial operations linked to this transaction are closed.'
    },
    PARTIALLY_SETTLED: {
        code: '123',
        value: 'Partially Settled',
        description: 'A part of the financial operations linked to this transaction is closed.'
    },
    DEBITED: {
        code: '131',
        value: 'Debited',
        description: 'The acquirer has informed us that a debit linked to the transaction is going to be applied.'
    },
    PARTIALLY_DEBITED: {
        code: '132',
        value: 'Partially Debited',
        description: 'The acquirer has informed us that a partial debit linked to the transaction is going to be applied.'
    },
    AUTHENTICATION_REQUESTED: {
        code: '140',
        value: 'Authentication Requested',
        description: 'The payment method used requires authentication; authentication request has been sent and the system is waiting for an action from the customer.'
    },
    AUTHENTICATED: {
        code: '141',
        value: 'Authenticated',
        description: 'The payment method used requires authentication and it was successful.'
    },
    ACQUIRER_FOUND: {
        code: '150',
        value: 'Acquirer Found',
        description: 'The acquirer’s payment route has been found.'
    },
    ACQUIRER_NOT_FOUND: {
        code: '151',
        value: 'Acquirer not Found',
        description: 'The acquirer’s payment route has not been found.'
    },
    CARDHOLDER_ENROLLMENT_UNKNOWN: {
        code: '160',
        value: 'Cardholder Enrollment Unknown',
        description: 'Unable to verify if the card is enrolled in the 3-D Secure program.'
    },
    RISK_ACCEPTED: {
        code: '161',
        value: 'Risk Accepted',
        description: 'The payment has been accepted by the fraud rule set.'
    },
    AUTHORIZATION_REFUSED: {
        code: '163',
        value: 'Authorization Refused',
        description: 'The authorization was refused by the financial institution.'
    }
};

Object.freeze(HiPayStatus);
module.exports.HiPayStatus = HiPayStatus;
