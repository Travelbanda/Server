'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
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
