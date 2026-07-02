'use strict';

/**
 * PayPal V2 (HiPay SDK) checkout integration.
 *
 * This file replaces the previous "one-shot at page load" implementation. The original
 * code:
 *   - read the total/currency once at module load (so a basket total change required a
 *     full page reload),
 *   - mounted on a single hard-coded `#paypal-button` id (so it could not coexist with
 *     a second placement),
 *   - never re-mounted, never destroyed, and only listened for `paymentAuthorized`,
 *   - did not check whether PayPal was even enabled before mounting,
 *   - blindly hid the `.place-order` button as a side effect of creating the instance.
 *
 * The rewrite addresses each of those points:
 *
 *  1. Placement awareness
 *     The HiPay site preference `hipayPaypalButtonPlacement` selects between
 *     `submitPayment` (button rendered in the payment tab) and `placeOrder` (button
 *     rendered on the place-order step). The two placements have distinct DOM ids
 *     (`paypal-button-submit-payment` / `paypal-button-place-order`) and the helpers
 *     below always derive the active id from the current preference.
 *
 *  2. Eligibility & fallback
 *     `isPaypalV2Eligible()` (in hipayPaymentHelper.js) tells us whether PayPal V2
 *     should be offered to the current user. When the answer is "no" we hide the
 *     PayPal nav item and, if the user happened to have it selected, automatically
 *     click the first available fallback payment method so the checkout never gets
 *     stuck on an unusable tab.
 *
 *  3. Dynamic re-initialisation
 *     The HiPay SDK does not let us mutate the amount/currency of an existing PayPal
 *     instance reliably across all flows. We therefore keep track of a "request
 *     signature" (placement + amount + currency) and, when it changes, tear down the
 *     instance and remount on the live container. A MutationObserver on
 *     `data-checkout-stage` triggers re-sync when the user moves between checkout
 *     steps, and a second observer on the button container itself reports when the
 *     SDK actually finishes rendering (used by billing.js to decide whether to keep
 *     the SFRA place-order CTA visible).
 *
 *  4. Order ID hygiene
 *     `paypalOrderState` keeps the last orderID together with the signature it was
 *     authorised for. If the basket changes (different signature) the orderID is
 *     invalidated so we cannot submit a stale PayPal authorisation against a
 *     different amount/currency. The hidden form field is kept in sync.
 *
 *  5. Privacy notice mirroring
 *     In the `submitPayment` placement the standard SFRA "next step" button carries a
 *     privacy notice; we clone it under the PayPal button so the notice still appears
 *     when PayPal replaces that CTA.
 */

var formHelpers = require('base/checkout/formErrors');
var hipayGlobalVariable = require('./globalVariable');
var hipayPaymentHelper = require('./hipayPaymentHelper');

// Current HiPay PayPal instance (null when no button is mounted).
var instancePayPal = null;
// Selector and DOM element the live instance was mounted on. Used to detect when the
// container has been swapped out (e.g. by an Ajax reflow) and the instance must be
// re-created.
var currentSelector = null;
var currentButtonElement = null;
// MutationObserver on `#checkout-main[data-checkout-stage]` that triggers re-sync
// whenever the checkout moves between stages.
var paypalStageObserver = null;
// MutationObserver on the PayPal button container that reports when the HiPay SDK
// finishes rendering its button.
var paypalButtonObserver = null;
var observedPaypalButtonElement = null;
// Last request signature the active SDK instance was created with. Used to short-
// circuit redundant re-creations.
var paypalInstanceRequestSignature = null;
// Persisted PayPal order state: the orderID returned by the SDK and the signature it
// belongs to. The signature lets us spot stale orderIDs after a basket change.
var paypalOrderState = {
    orderID: '',
    requestSignature: null
};

function getPaypalPlacement() {
    return window.hipayCustomPreferences
        && window.hipayCustomPreferences.paypalV2
        && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement;
}

function getPaypalButtonId() {
    return getPaypalPlacement() === 'placeOrder'
        ? 'paypal-button-place-order'
        : 'paypal-button-submit-payment';
}

function getPaypalButton() {
    return $(`#${getPaypalButtonId()}`);
}

// The HiPay SDK injects its actual button into a `#hipay-paypal-button-container`
// child of the mount element. We rely on the presence/visibility of that child to
// determine whether the SDK has finished rendering.
function getPaypalSdkButtonContainer() {
    return getPaypalButton().find('#hipay-paypal-button-container');
}

function getPaypalNavItem() {
    return $("li[data-method-id='HIPAY_PAYPAL_V2']");
}

/**
 * If PayPal V2 becomes ineligible while the user has it selected, switch to the
 * first non-hidden payment tab so the checkout stays usable.
 */
function selectFallbackPaymentMethod() {
    var $fallbackItem;

    if (!isPaypalPaymentSelected()) {
        return;
    }

    $fallbackItem = $('.payment-options .nav-item[data-method-id]')
        .not("[data-method-id='HIPAY_PAYPAL_V2']")
        .not('.d-none')
        .first();

    if ($fallbackItem.length) {
        $fallbackItem.trigger('click');
    }
}

function syncPaypalEligibility() {
    var isEligible = hipayPaymentHelper.isPaypalV2Eligible();
    var $paypalNavItem = getPaypalNavItem();

    if ($paypalNavItem.length) {
        $paypalNavItem.toggleClass('d-none', !isEligible);
    }

    if (!isEligible) {
        selectFallbackPaymentMethod();
    }

    return isEligible;
}

function clearPaypalButton() {
    clearPaypalButtonElement(getPaypalButton());
}

function clearPaypalButtonElement($paypalButton) {
    if ($paypalButton && $paypalButton.length) {
        $paypalButton.empty();
        // Reset the readiness flag so billing.js shows the SFRA place-order CTA
        // again until the SDK fires `ready` for the new mount.
        $paypalButton.attr('data-hipay-paypal-ready', 'false');
    }
}

function getPaypalTotal($paypalButton) {
    return ($paypalButton || getPaypalButton()).attr('data-total');
}

/**
 * Builds the request signature that identifies a PayPal authorisation context.
 *
 * Combining the placement, amount and currency lets us detect whenever any of those
 * changes (e.g. the basket total updated after a discount, or the user switched
 * shipping options) and, in that case, invalidate the previously authorised PayPal
 * orderID before submitting.
 */
function buildPaypalRequestSignature(total, currency, selector) {
    if (!total || !currency) {
        return null;
    }

    return [selector || getPaypalButtonId(), total, currency].join('|');
}

function setStoredPaypalOrderID(orderID, requestSignature) {
    var normalizedOrderID = orderID && String(orderID).trim();

    paypalOrderState.orderID = normalizedOrderID || '';
    paypalOrderState.requestSignature = paypalOrderState.orderID ? requestSignature || null : null;
    $('input[name=dwfrm_billing_paypalV2OrderID]').val(paypalOrderState.orderID);

    return Boolean(paypalOrderState.orderID);
}

/**
 * Drops a stored orderID whose signature no longer matches the current context.
 * This is the safety net that prevents the server from receiving a PayPal orderID
 * authorised against a stale amount/currency.
 */
function syncStoredPaypalOrderID(requestSignature) {
    if (paypalOrderState.orderID
        && paypalOrderState.requestSignature
        && requestSignature
        && paypalOrderState.requestSignature !== requestSignature) {
        paypalOrderState.orderID = '';
        paypalOrderState.requestSignature = null;
    }

    $('input[name=dwfrm_billing_paypalV2OrderID]').val(paypalOrderState.orderID || '');
}

function getCheckoutStage() {
    return $('#checkout-main').attr('data-checkout-stage')
        || new URLSearchParams(window.location.search).get('stage');
}

function getCurrencyCode() {
    return $('.form-control.paymentMethod').first().data('currency-code');
}

/**
 * Determines which payment method id is currently selected.
 *
 * The active nav tab is the source of truth on the payment step. On later steps the
 * `.payment-information` block carries the selection. The base SFRA dataset uses the
 * generic `CREDIT_CARD` id for HiPay's credit card method, so we normalise it.
 */
function getSelectedPaymentMethodId() {
    var activeMethodId = $('.payment-options .nav-link.active')
        .not('.gift-card-header')
        .closest('.nav-item')
        .data('method-id');
    var selectedMethodId;

    if (activeMethodId) {
        return activeMethodId;
    }

    selectedMethodId = $('.payment-information').data('payment-method-id');

    return selectedMethodId === 'CREDIT_CARD'
        ? 'HIPAY_CREDIT_CARD'
        : selectedMethodId;
}

function isPaypalPaymentSelected() {
    return getSelectedPaymentMethodId() === 'HIPAY_PAYPAL_V2';
}

/**
 * `paymentAuthorized` callback wired to the HiPay SDK instance.
 *
 * Beyond persisting the orderID and delegating to the shared helper, the handler
 * computes the current request signature so the stored orderID carries the context
 * it was authorised for. This is what guards against amount/currency mismatches at
 * submission time.
 */
function handlePaymentAuthorized(paypalData) {
    var total = getPaypalTotal();
    var currency = getCurrencyCode();
    var requestSignature = buildPaypalRequestSignature(total, currency, getPaypalButtonId());

    $.spinner().start();
    formHelpers.clearPreviousErrors('.payment-form');

    if (!setStoredPaypalOrderID(paypalData && paypalData.orderID, requestSignature)) {
        $.spinner().stop();
        return;
    }

    $('body').trigger('checkout:disableButton', '.next-step-button button');

    if (getPaypalPlacement() === 'submitPayment') {
        hipayPaymentHelper.submitBillingAndplaceOrder(
            hipayPaymentHelper.serializeBillingAddressForm(),
            'HIPAY_PAYPAL_V2'
        );
    } else if (getPaypalPlacement() === 'placeOrder') {
        hipayPaymentHelper.placeOrder('HIPAY_PAYPAL_V2', paypalData.orderID);
    }
}

function isPaypalButtonRendered() {
    var $sdkButtonContainer = getPaypalSdkButtonContainer();

    return $sdkButtonContainer.length > 0 && !$sdkButtonContainer.prop('hidden');
}

/**
 * Writes the `data-hipay-paypal-ready` flag on the button container. billing.js
 * reads this flag to decide whether to keep the SFRA place-order CTA visible
 * during the brief window where PayPal is selected but the SDK button has not
 * been rendered yet.
 */
function updatePaypalRenderState(forceRenderedState) {
    var $paypalButton = getPaypalButton();
    var isRendered = typeof forceRenderedState === 'boolean'
        ? forceRenderedState
        : isPaypalButtonRendered();

    if ($paypalButton.length) {
        $paypalButton.attr('data-hipay-paypal-ready', isRendered ? 'true' : 'false');
    }

    return isRendered;
}

function disconnectPaypalButtonObserver() {
    if (paypalButtonObserver) {
        paypalButtonObserver.disconnect();
        paypalButtonObserver = null;
    }

    observedPaypalButtonElement = null;
}

/**
 * Updates the readiness flag and broadcasts an event other components can listen on.
 * The event is a convenient extension point even if nothing in the cartridge needs
 * it today.
 */
function notifyPaypalAvailability(forceRenderedState) {
    updatePaypalRenderState(forceRenderedState);
    $('body').trigger('hipay:paypalv2-availability');
}

/**
 * Mutates the live SDK instance's request payload so that future authorisations use
 * the up-to-date amount/currency. We still tear the instance down when the signature
 * changes (see `initializePayPal`), but this keeps the in-memory copy consistent
 * with the basket whenever a teardown is not needed.
 */
function syncPaypalRequest(total, currency) {
    if (!instancePayPal) {
        return;
    }

    if (!instancePayPal.options) {
        instancePayPal.options = {};
    }

    if (!instancePayPal.options.request) {
        instancePayPal.options.request = {};
    }

    if (total) {
        instancePayPal.options.request.amount = total;
    }

    if (currency) {
        instancePayPal.options.request.currency = currency;
    }
}

function syncExistingPaypalInstance(total, currency, requestSignature) {
    if (!instancePayPal) {
        return;
    }

    syncPaypalRequest(total, currency);
    paypalInstanceRequestSignature = requestSignature || null;
}

/**
 * Detects when the page has swapped the PayPal button DOM node (typical after an
 * Ajax reflow of the checkout). In that case the existing SDK instance still points
 * at the now-detached node and must be destroyed before we can mount on the new one.
 */
function hasPaypalButtonElementChanged($paypalButton) {
    var nextButtonElement = ($paypalButton || getPaypalButton()).get(0);

    return Boolean(instancePayPal)
        && Boolean(currentButtonElement)
        && Boolean(nextButtonElement)
        && currentButtonElement !== nextButtonElement;
}

function buildPaypalMount($paypalButton) {
    if (!$paypalButton || !$paypalButton.length) {
        return null;
    }

    // Empty the container before mounting so the SDK starts from a clean slate.
    $paypalButton.empty();
    $paypalButton.attr('data-hipay-paypal-ready', 'false');

    return getPaypalButtonId();
}

function destroyInstance() {
    var $currentButton = currentButtonElement ? $(currentButtonElement) : $();

    if (instancePayPal && typeof instancePayPal.destroy === 'function') {
        try {
            instancePayPal.destroy();
        } catch (error) {
            // Ignore: certain HiPay SDK versions throw when destroy() runs on an
            // instance whose DOM was already removed by SFRA. Either way we are
            // about to drop the reference.
        }
    }

    clearPaypalButtonElement($currentButton);
    instancePayPal = null;
    paypalInstanceRequestSignature = null;
    currentSelector = null;
    currentButtonElement = null;
    disconnectPaypalButtonObserver();
    clearPaypalButton();
    notifyPaypalAvailability(false);
}

function observePaypalButtonRender() {
    var $paypalButton = getPaypalButton();
    var paypalButton = $paypalButton.get(0);

    if (!paypalButton) {
        disconnectPaypalButtonObserver();
        return;
    }

    if (paypalButtonObserver && observedPaypalButtonElement === paypalButton) {
        return;
    }

    disconnectPaypalButtonObserver();

    paypalButtonObserver = new MutationObserver(() => {
        notifyPaypalAvailability();
    });
    observedPaypalButtonElement = paypalButton;

    // Watch both attribute toggles (the SDK sometimes hides itself via `hidden`)
    // and DOM additions/removals within the container so we catch the moment the
    // SDK injects/removes its rendered button.
    paypalButtonObserver.observe(paypalButton, {
        attributes: true,
        attributeFilter: ['hidden'],
        childList: true,
        subtree: true
    });

    notifyPaypalAvailability();
}

/**
 * Returns true only when the conditions are right to mount/refresh the PayPal SDK:
 *   - PayPal V2 is eligible,
 *   - the container exists and is visible (the template/CSS chose to show it),
 *   - and the user is on the relevant stage for the configured placement.
 */
function shouldInitializePayPal() {
    var $paypalButton = getPaypalButton();

    if (!syncPaypalEligibility()) {
        return false;
    }

    if (!$paypalButton.length || !$paypalButton.is(':visible')) {
        return false;
    }

    if (getPaypalPlacement() === 'submitPayment') {
        return getCheckoutStage() === 'payment' && isPaypalPaymentSelected();
    }

    return getCheckoutStage() === 'placeOrder';
}

/**
 * In the `submitPayment` placement we deliberately leave the existing instance in
 * place when the user toggles between payment tabs at the payment step: the PayPal
 * button is hidden by CSS rules in billing.js while another method is selected, but
 * destroying the instance would force a full SDK re-init when they switch back,
 * losing the previously rendered button and any pending state.
 */
function shouldKeepExistingInstance() {
    return Boolean(instancePayPal)
        && getPaypalPlacement() === 'submitPayment'
        && getCheckoutStage() === 'payment'
        && !isPaypalPaymentSelected();
}

function canReusePaypalInstance($paypalButton, selector) {
    return Boolean(instancePayPal)
        && $paypalButton.length
        && currentButtonElement === $paypalButton.get(0)
        && currentSelector === selector;
}

/*
 * Marker flags below (`moPaypalBound`, `moPaypalStateBound`) are stamped on the SDK
 * instance to guarantee we only attach each listener once even if `initializePayPal`
 * runs again with the same instance. Without them the same handler would stack and
 * a single PayPal click would fire N submissions.
 */
function bindPaymentAuthorized() {
    if (!instancePayPal || instancePayPal.moPaypalBound) {
        return;
    }

    instancePayPal.moPaypalBound = true;
    instancePayPal.on('paymentAuthorized', handlePaymentAuthorized);
}

/**
 * In the `submitPayment` placement the PayPal button replaces the standard SFRA
 * "next step" button, which normally hosts a privacy notice. We clone that notice
 * and append it under the PayPal button so the disclosure remains visible.
 */
function syncPaypalSubmitPaymentNotice() {
    var $paypalButton = getPaypalButton();
    var $notice = $('.next-step-button .js-checkout-privacy-notice').first().clone();

    if (getPaypalPlacement() !== 'submitPayment' || !$paypalButton.length) {
        return;
    }

    $paypalButton.find('.js-checkout-privacy-notice').remove();

    if ($notice.length) {
        $paypalButton.append($notice);
    }
}

function bindPayPalStateEvents() {
    if (!instancePayPal || instancePayPal.moPaypalStateBound) {
        return;
    }

    instancePayPal.moPaypalStateBound = true;
    instancePayPal.on('ready', () => {
        syncPaypalSubmitPaymentNotice();
        observePaypalButtonRender();
        notifyPaypalAvailability();
    });
    instancePayPal.on('paymentUnauthorized', () => {
        // Wipe the stored orderID so the next checkout attempt cannot replay a
        // PayPal authorisation that the SDK already invalidated.
        setStoredPaypalOrderID('');
        notifyPaypalAvailability(false);
    });
    instancePayPal.on('cancel', () => {
        setStoredPaypalOrderID('');
        notifyPaypalAvailability();
    });
}

/**
 * Top-level entry that decides whether to mount, reuse, or tear down the SDK
 * instance based on the current eligibility, placement, stage, selection and
 * basket signature.
 */
function initializePayPal() {
    var hipay = hipayGlobalVariable.getGlobalVariable();
    var $paypalButton = getPaypalButton();
    var shouldInitialize = shouldInitializePayPal();
    var total = getPaypalTotal($paypalButton);
    var currency = getCurrencyCode();
    var selector = getPaypalButtonId();
    var requestSignature = buildPaypalRequestSignature(total, currency, selector);
    var mountId;

    syncStoredPaypalOrderID(requestSignature);

    if (hasPaypalButtonElementChanged($paypalButton)) {
        destroyInstance();
    }

    if (shouldKeepExistingInstance()) {
        if (instancePayPal) {
            syncExistingPaypalInstance(total, currency, requestSignature);
        }
        observePaypalButtonRender();
        notifyPaypalAvailability();
        return;
    }

    if (!shouldInitialize) {
        if (instancePayPal) {
            syncExistingPaypalInstance(total, currency, requestSignature);
        }
        notifyPaypalAvailability(false);
        return;
    }

    if (!hipay || !requestSignature) {
        return;
    }

    if (canReusePaypalInstance($paypalButton, selector)) {
        syncExistingPaypalInstance(total, currency, requestSignature);
        observePaypalButtonRender();
        notifyPaypalAvailability();
        return;
    }

    destroyInstance();
    mountId = buildPaypalMount($paypalButton);

    if (!mountId) {
        return;
    }

    instancePayPal = hipay.create('paypal', {
        canPayLater: window.hipayCustomPreferences.paypalV2.options.canPayLater,
        request: {
            amount: total,
            currency
        },
        paypalButtonStyle: window.hipayCustomPreferences.paypalV2.style,
        selector: mountId,
        template: 'auto'
    });
    paypalInstanceRequestSignature = requestSignature;
    currentSelector = selector;
    currentButtonElement = $paypalButton.get(0);

    bindPaymentAuthorized();
    bindPayPalStateEvents();
    observePaypalButtonRender();
}

function syncPayPal() {
    observePaypalButtonRender();
    notifyPaypalAvailability();
    initializePayPal();

    // Hides the PayPal button if the current page is not the 'placeOrder' stage and
    // the PayPal button placement is configured to be only on the 'placeOrder' stage.
    // This prevents the PayPal button from being displayed on page.
    var urlParams = new URLSearchParams(window.location.search);
    var stage = urlParams.get('stage');
    // Remove next-step-button if HIPAY_PAYPAL_V2 is clicked.
    if (window.hipayCustomPreferences &&
        window.hipayCustomPreferences.paypalV2 &&
        window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment'
        && stage === 'payment'
    )
    {
        setTimeout(function () {
            $('.nav-item').on('click', function() {
                if ($(this).data('method-id') === 'HIPAY_PAYPAL_V2') {
                    $('.next-step-button').toggleClass('d-none');
                } else {
                    $('.next-step-button').toggleClass('d-none');
                }
            });
        }, 500);
    }

    if ($('.nav-item .nav-link.active').parents().data('method-id') === 'HIPAY_PAYPAL_V2')
    {
        if (stage === 'placeOrder' && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'placeOrder') {
            $('.next-step-button .btn-block.place-order').addClass('d-none');
            $('#paypal-button-place-order').removeClass('d-none');
        } else if (stage === 'payment' && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment') {
            $('.next-step-button .btn-block.submit-payment').addClass('d-none');
            $('#paypal-button-place-order').removeClass('d-none');
        }
    } else {
        if (stage === 'payment' ) {
            $('.next-step-button .btn-block.submit-payment').removeClass('d-none');
            $('.next-step-button .btn-block.place-order').addClass('d-none');
        } else if(stage === 'placeOrder') {
            $('.next-step-button .btn-block.submit-payement').addClass('d-none');
            $('.next-step-button .btn-block.place-order').removeClass('d-none');
        }
        $('#paypal-button-place-order').addClass('d-none');
    }
}

/*
 * Event wiring. The `setTimeout(..., 0)` calls defer execution to the next tick so
 * SFRA has time to mutate the DOM (active tab change, form re-render, etc.) before
 * we read it.
 */
function bindPayPalEvents() {
    $('.payment-options').on('click.hipayPaypalV2', '.nav-item', (event) => {
        if ($(event.currentTarget).data('method-id') !== 'HIPAY_PAYPAL_V2') {
            // User left PayPal: invalidate any stored authorisation so it cannot
            // leak into a subsequent submission with a different method.
            setStoredPaypalOrderID('');
        }
        setTimeout(syncPayPal, 0);
    });

    $('body').on('checkout:updateCheckoutView', () => {
        setTimeout(syncPayPal, 0);
    });

    // Country-driven eligibility is currently disabled in the helper, but the hook
    // is kept so future merchants can opt in by overriding `shouldUsePaypalCountryEligibility`.
    $('body').on('change.hipayPaypalV2', '.billingCountry, .shippingCountry, select[name$="countries_countryCode"]', () => {
        if (hipayPaymentHelper.shouldUsePaypalCountryEligibility()) {
            setTimeout(syncPayPal, 0);
        }
    });
}

function observeCheckoutStage() {
    var checkoutMain = document.getElementById('checkout-main');

    if (!checkoutMain || paypalStageObserver) {
        return;
    }

    paypalStageObserver = new MutationObserver(() => {
        syncPayPal();
    });

    paypalStageObserver.observe(checkoutMain, {
        attributes: true,
        attributeFilter: ['data-checkout-stage']
    });
}

bindPayPalEvents();
observeCheckoutStage();
syncPaypalEligibility();
syncPayPal();
