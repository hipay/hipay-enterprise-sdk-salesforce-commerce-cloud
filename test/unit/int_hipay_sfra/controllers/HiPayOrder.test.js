'use strict';

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var hipayStatusPath = path.resolve(__dirname, '../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/hipayStatus');
var hipayOrderModulePath = path.resolve(__dirname, '../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayOrderModule');
var hipayHelperPath = path.resolve(__dirname, '../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/hipayHelper.js');
var controllerPath = path.resolve(__dirname, '../../../../cartridges/int_hipay_sfra/cartridge/controllers/HiPayOrder');

var statuses = require(hipayStatusPath).HiPayStatus;

// Real hiPayVerifyStatus (reads global.request, mirrors production) wired to the real status config,
// so the tests exercise the actual ACCEPT/PENDING paymentStatus arrays rather than a fake copy of them.
var realHipayOrderModule = proxyquire(hipayOrderModulePath, {
    '*/cartridge/scripts/lib/hipay/hipayStatus': { HiPayStatus: statuses }
});

describe('controllers/HiPayOrder', function () {
    var routes;
    var state;

    before(function () {
        var fakeServer = {
            get: function (name) {
                routes[name] = arguments[arguments.length - 1];
            },
            middleware: { https: function () {} },
            exports: function () { return {}; }
        };

        routes = {};

        proxyquire(controllerPath, {
            server: fakeServer,
            'dw/system/Logger': { info: function () {}, warn: function () {}, error: function () {} },
            'dw/web/URLUtils': { url: function () { return 'url'; }, https: function () { return 'url'; } },
            'dw/order/OrderMgr': { getOrder: function () {}, failOrder: function () {} },
            'dw/system/Transaction': { wrap: function (cb) { return cb(); } },
            'dw/web/Resource': { msg: function () { return ''; } },
            '*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule': {},
            '*/cartridge/scripts/lib/hipay/modules/hipayOrderModule': {
                hiPayVerifyStatus: realHipayOrderModule.hiPayVerifyStatus,
                hiPayProcessOrderCall: function () { return state.processOrderCallResult(); }
            },
            '*/cartridge/scripts/lib/hipay/hipayProcess': {
                verifyHash: function () { return state.isHashValid; },
                proceedWithOrder: function (order) { state.proceedWithOrderCalls.push(order); },
                failOrder: function (params) { state.failOrderCalls.push(params); return state.failOrderResult; }
            },
            '*/cartridge/scripts/lib/hipay/hipayStatus': { HiPayStatus: statuses },
            '*/cartridge/scripts/lib/hipay/hipayPendingOrderHelper': {}
        });
    });

    beforeEach(function () {
        state = {
            isHashValid: true,
            failOrderResult: 'https://example.com/on/demandware.store/Sites-Site/COPlaceOrder-Submit',
            proceedWithOrderCalls: [],
            failOrderCalls: [],
            redirectCalls: [],
            processOrderCallResult: function () { return { order: { orderNo: '00000001' }, error: false }; }
        };
    });

    afterEach(function () {
        delete global.request;
    });

    function invokeAccept(querystring, numericStatus) {
        global.request = { httpParameterMap: { status: { value: String(numericStatus) } } };

        var req = { querystring: querystring };
        var res = { redirect: function (url) { state.redirectCalls.push(url); } };
        var nextCalls = 0;

        routes.Accept(req, res, function () { nextCalls += 1; });

        return nextCalls;
    }

    describe('acceptPayment via the Accept route', function () {
        it('keeps ACCEPT + completed + 116 valid (unchanged baseline path)', function () {
            invokeAccept({ state: 'completed', status: '116' }, 116);

            assert.strictEqual(state.proceedWithOrderCalls.length, 1);
            assert.strictEqual(state.failOrderCalls.length, 0);
        });

        it('keeps ACCEPT + completed + 118 valid (unchanged baseline path)', function () {
            invokeAccept({ state: 'completed', status: '118' }, 118);

            assert.strictEqual(state.proceedWithOrderCalls.length, 1);
            assert.strictEqual(state.failOrderCalls.length, 0);
        });

        it('makes ACCEPT + forwarding + 142 valid (new narrow exception)', function () {
            invokeAccept({ state: 'forwarding', status: '142' }, 142);

            assert.strictEqual(state.proceedWithOrderCalls.length, 1);
            assert.strictEqual(state.failOrderCalls.length, 0);
        });

        it('keeps ACCEPT + forwarding + another status invalid', function () {
            invokeAccept({ state: 'forwarding', status: '143' }, 143);

            assert.strictEqual(state.proceedWithOrderCalls.length, 0);
            assert.strictEqual(state.failOrderCalls.length, 1);
            assert.strictEqual(state.failOrderCalls[0].hiPayState, 'error');
        });

        it('still rejects ACCEPT + forwarding + 142 when the hash is invalid', function () {
            state.isHashValid = false;

            invokeAccept({ state: 'forwarding', status: '142' }, 142);

            assert.strictEqual(state.proceedWithOrderCalls.length, 0);
            assert.strictEqual(state.failOrderCalls.length, 1);
            assert.strictEqual(state.failOrderCalls[0].hiPayState, 'error');
        });
    });

    describe('hipayStatus.js configuration (unmodified)', function () {
        it('does not list 142 under ACCEPT.paymentStatus', function () {
            assert.notInclude(statuses.ACCEPT.paymentStatus, 142);
        });

        it('still lists 142 under PENDING.paymentStatus', function () {
            assert.include(statuses.PENDING.paymentStatus, 142);
        });
    });

    describe('hipayHelper.js placedStatuses (unmodified)', function () {
        it('still limits order placement to AUTHORIZED/CAPTURE_REQUESTED/CAPTURED/PARTIALLY_CAPTURED codes only', function () {
            var source = fs.readFileSync(hipayHelperPath, 'utf8');
            var match = source.match(/var placedStatuses = \[([\s\S]*?)\];/);

            assert.isNotNull(match, 'placedStatuses array should still exist in hipayHelper.js');

            var body = match[1];

            assert.include(body, 'statuses.AUTHORIZED.code');
            assert.include(body, 'statuses.CAPTURE_REQUESTED.code');
            assert.include(body, 'statuses.CAPTURED.code');
            assert.include(body, 'statuses.PARTIALLY_CAPTURED.code');
            assert.notInclude(body, 'PENDING');
            assert.notInclude(body, 'FORWARDING');
            assert.notInclude(body, 'AUTHORIZATION_REQUESTED');
        });
    });
});
