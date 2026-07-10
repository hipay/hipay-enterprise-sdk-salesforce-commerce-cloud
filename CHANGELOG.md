## CHANGELOG

## Version 26.2.1
- Fixed the Apple Pay checkout flow by ensuring `CheckoutServices-SubmitPayment` is executed before `CheckoutServices-PlaceOrder`.
- Improved Apple Pay session handling by correctly completing the payment sheet on both success and failure.
- Added additional validation before Apple Pay initialization to prevent execution when the browser or configuration is not eligible.
- Fixed Apple Pay currency initialization by using the storefront currency configuration.
- Fixed Apple Pay payment request synchronization after basket updates (such as coupon application) so the Apple Pay sheet always displays the latest basket total.
- Enabled Hosted Credit Card payment method for all configured countries and currencies by removing unnecessary Business Manager restrictions.
- Fixed the Hosted Fields layout for co-branded BCMC/Bancontact cards to prevent the network selection label from overlapping the CVC field.
- Fixed payment method fallback when Alma is unavailable so supported payment methods remain visible.
- Improved cleanup of stale HiPay payment error messages when switching payment methods or retrying checkout.
- Improved notification persistence when optional notification timestamp metadata is unavailable.
- Updated notification processing to sort notifications using `creationDate`.
- Improved notification processing robustness to reduce optimistic locking conflicts during concurrent order updates.
- Fixed category retrieval for non-variant products when building HiPay requests.
- Fixed the Business Manager menu label from `Hipay Transations` to `Hipay Transactions`.
- Updated the recommended BCMC/Bancontact 3-D Secure configuration to use "3-D Secure authentication if available".

## Version 26.2.0
- Multi-country support: Enable or disable PayPal per country. When disabled, the checkout automatically falls back to another payment method.
- Flexible button placement: Support for displaying the PayPal button at different checkout steps (Submit Payment or Place Order).
- Automatic reinitialization: The PayPal module resets when key parameters change (amount, currency, button placement, or checkout structure).
- Improved security: PayPal order IDs are invalidated when the cart changes, and server-side validation prevents submission without a valid PayPal order ID.
- Enhanced error handling: Error messages are displayed next to the active PayPal button.
- Alma payment: Preserve the basket when the payment is cancelled or declined.

## Version 26.1.0
- Fixed payment processing when the transaction amount was equal to zero.
- Changed the maximum length validation for the address form fields.
- Fixed the ipaddr variable in the API request.
- Changed logo iDeal

## Version 25.4.2
- fix: Map new status codes to correctly handle 3DS flow

# Version 25.4.1
- Update hipayStatus file: https://developer.hipay.com/payment-fundamentals/essentials/transaction-status

## Version 25.4.0
- **Add** : Added new payment means :
    - Alma
    - PayPal V2
- **Add** : Updated one click payment
- **Fix** : Fixed notification processing in correct order
- **Fix** : Fixed iDeal payment method by removing `issuer_bank_id`

# Version 23.1.0
- Refactoring

## Version 20.1.0
- Add DSP2 parameters

## Version 2.1.0
- Update with latest module version

## Version 2.0.0
- Migration to the Javascript controller.

## Version 1.1.2
- Updates links to documentation.

## Version 1.1.1
- Uses default config for a site if no specific one is found

## Version 1.1.0
- Adds support for multi sites configuration

## Version 1.0.1
- README file updates
- License and contributing guidelines files added

## Version 1.0.0
First production-ready version.
