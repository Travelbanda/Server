'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

const
	config = require('config'),
	configRequest = /\/config\.js$/;

/**
 * Config JSONp
 */
module.exports = function (ctx, next) {
	if (configRequest.test(ctx.path)) {
		ctx.type = 'text/javascript';
		ctx.body = `var CONFIG = ${JSON.stringify(config.envs)};`;
		return;
	}

	return next();
};
