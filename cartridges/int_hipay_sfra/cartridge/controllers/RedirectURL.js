'use strict';

var server = require('server');

server.extend(module.superModule);

var Site = require('dw/system/Site');

server.prepend('Start', function (req, res, next) {
    var URLRedirectMgr = require('dw/web/URLRedirectMgr');
    const appleMerchantId = Site.getCurrent().getCustomPreferenceValue("hipayAppleMerchantID");
    if (URLRedirectMgr.getRedirectOrigin() === '/.well-known/apple-developer-merchantid-domain-association' && !empty(appleMerchantId)) {
        res.setContentType('text/plain');
        res.print(appleMerchantId);
        this.done(req, res);
        return;
    }

    next();
});

module.exports = server.exports();