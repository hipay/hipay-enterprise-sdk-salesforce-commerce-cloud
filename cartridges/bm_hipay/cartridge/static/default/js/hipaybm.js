/* global Ext jQuery */

var ingenicoAdmin = (function ($) {
    var ajaxDialog;

    function showAPIErrorMessage(apiResponse) {
        if (apiResponse) {
            alert(ingenicoAdmin.resources.apiRequestFailedWith + "\n\n" + JSON.stringify(apiResponse, null, 4))
        } else {
            alert(ingenicoAdmin.resources.apiRequestFailed);
        }
    }

    function initEvents() {       
        $('.js_ingenicobm_switch_order_search_forms').on('click', function(e) {
            e.preventDefault();
            var $clickedLink = $(e.target);

            $('.js_ingenicobm_order_search_form').addClass('hidden');
            $('#' + $clickedLink.data('targetid')).removeClass('hidden');
        })

        $('.js_ingenico_ajax_dialog').on('click', function (e) {
            e.preventDefault();

            var $button = $(this);
            ajaxDialog = new Ext.Window({
                title: ingenicoAdmin.resources.detailsDialogTitle,
                width: 800,
                height: 200,
                modal: true,
                autoScroll: true,
                cls: 'ingenicobm_window_content payments-dialog'
            });    
            ajaxDialog.show();
            ajaxDialog.maskOver = createMaskOver(ajaxDialog);

            ajaxDialog.maskOver.show();
            $.ajax({
                url: $button.attr('href'),
                error: function () {
                    ajaxDialog.maskOver.hide();
                    if (ajaxDialog) {
                        ajaxDialog.close();
                    }
                },
                success: function (data) {
                    ajaxDialog.maskOver.hide();

                    if (typeof data === "object" && data.success === false) {
                        ajaxDialog.close();

                        showAPIErrorMessage(data.errorMessage);
                        return;
                    }

                    if (ajaxDialog) {
                        $('#' + ajaxDialog.body.id).html(data);
                        ajaxDialog.setHeight('auto');
                        ajaxDialog.center();
                    } else {
                        $('.js_ingenicobm_content').html(data);
                    }


                    if ($button.data('dialog-id') === 'payments-dialog') {
                        initPaymentsDialogEvents();
                        $(".js_payment_transactions_tab_headings a").first().click();
                    }
                }
            });
            return false;
        });
    }

    function createMaskOver(panel) {
        return (function () {
            return {
                ext: new Ext.LoadMask(panel.getEl()),
                show: function (type) {
                    this.ext.show();
                },
                hide: function () {
                    this.ext.hide();
                }
            };
        }());
    }

    function initPaymentsDialogEvents() {
        let $tabContentsDiv = $(".js_payment_transactions_tab_contents");
        let $paymentDetailsDiv = $(".js_payment_details");
        let $inputAmount = $('#ing_amount');
        let currencyCode = $paymentDetailsDiv.data('currency-code');

        $(".js_payment_transactions_tab_headings a").off("click").on("click", function (e) {
            e.preventDefault();

            var $clickedLink = $(e.target);

            $(".js_payment_transactions_tab_headings a").removeClass("selected");
            $clickedLink.addClass("selected");

            refreshAJAXComponent($tabContentsDiv, $clickedLink.data('contents-url'), function() {
                initPaymentsDialogEvents();
            });
        });

        $(".js_btn_capture").off("click").on("click", function (e) {
            e.preventDefault();

            let amount = parseFloat($inputAmount.val());
            if (isNaN(amount) || !(amount > 0)) {
                $inputAmount.focus();
                return;
            }

            $paymentDetailsDiv.addClass("component-loading");
            capturePayment($paymentDetailsDiv.data('capture-payment-url'), amount, function (res) {
                if (res.success === false) {
                    showAPIErrorMessage(res.errorMessage);
                }

                refreshAJAXComponent($paymentDetailsDiv, $paymentDetailsDiv.data('refresh-details-url'), function() {
                    initPaymentsDialogEvents();
                });
                $(".js_payment_transactions_tab_headings a.captures").click();
            });
        });

        $(".js_btn_cancel").off("click").on("click", function (e) {
            e.preventDefault();

            $paymentDetailsDiv.addClass("component-loading");
            cancelPayment($paymentDetailsDiv.data('cancel-payment-url'), function (res) {
                if (res.success === false) {
                    showAPIErrorMessage(res.errorMessage);
                }

                refreshAJAXComponent($paymentDetailsDiv, $paymentDetailsDiv.data('refresh-details-url'), function() {
                    initPaymentsDialogEvents();
                });
            });
        });

        $(".js_btn_refund").off("click").on("click", function (e) {
            e.preventDefault();

            let amount = parseFloat($inputAmount.val());
            if (isNaN(amount) || !(amount > 0)) {
                $inputAmount.focus();
                return;
            }

            $paymentDetailsDiv.addClass("component-loading");
            refundPayment($paymentDetailsDiv.data('refund-payment-url'), amount, currencyCode, function (res) {
                if (res.success === false) {
                    showAPIErrorMessage(res.errorMessage);
                }

                refreshAJAXComponent($paymentDetailsDiv, $paymentDetailsDiv.data('refresh-details-url'), function() {
                    initPaymentsDialogEvents();
                });
                $(".js_payment_transactions_tab_headings a.refunds").click();
            });
        });
    }

    function capturePayment(url, amount, callback) {
        $.ajax({
            url: url,
            method: "POST",
            data: {
                amount: amount
            },
            error: function () {
                callback({
                    errors: [{ message: ingenicoAdmin.resources.serverError }]
                });
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    function cancelPayment(url, callback) {
        $.ajax({
            url: url,
            method: "POST",
            error: function () {
                callback({
                    errors: [{ message: ingenicoAdmin.resources.serverError }]
                });
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    function refundPayment(url, amount, currencyCode, callback) {
        $.ajax({
            url: url,
            method: "POST",
            data: {
                amount: amount,
                currencyCode: currencyCode
            },
            error: function () {
                callback({
                    errors: [{ message: ingenicoAdmin.resources.serverError }]
                });
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    function refreshAJAXComponent($targetDiv, refreshURL, callback) {
        $targetDiv.addClass('component-loading');

        $.ajax({
            url: refreshURL,
            error: function () {
                callback({
                    errors: [{ message: ingenicoAdmin.resources.serverError }]
                });
            },
            success: function (data) {
                $targetDiv.html(data);
                $targetDiv.removeClass('component-loading');

                $targetDiv.find(".btn-refresh").on("click", function (e) {
                    e.preventDefault();

                    refreshAJAXComponent($targetDiv, refreshURL, function () {
                        initPaymentsDialogEvents();
                    });
                });

                ajaxDialog.setHeight('auto');
                ajaxDialog.center();
                
                if (callback) {
                    callback();
                }
            }
        });
    }

    return {
        init: function (config) {
            $.extend(this, config);
            $(document).ready(function () {
                initEvents();
            });
        }
    };
}(jQuery));

