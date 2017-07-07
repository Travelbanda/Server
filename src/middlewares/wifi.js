'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

const
	URI = require('urijs'),
	mongoose = require('mongoose');

/**
 * Wifi session middleware
 */
module.exports = async function (ctx, next) {
	if (ctx.method === 'POST' && /chat/.test(ctx.path)) {
		const
			fields = ['dst', 'username', 'password', 'mac', 'ip', 'server-name', 'server-address'],
			info = Object.select(ctx.request.body, fields);

		if (Object.keys(info).length !== fields.length) {
			return next();
		}

		const session = await mongoose.model('AuthSession').create({info});
		ctx.redirect(new URI(isProd ? ctx.path.replace(/^\/chat/, '') : ctx.path).query({sessionHash: session._id}).toString());
		return;
	}

	return next();
};
