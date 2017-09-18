'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	path = require('path'),
	manifestRequest = /(\/favicons\/manifest\.json)$/;

/**
 * Manifest.json
 */
module.exports = async function (ctx, next) {
	const
		manifest = manifestRequest.exec(ctx.path);

	if (manifest) {
		const
			key = path.join('../../../', manifest[1]);

		if (isProd) {
			ctx.set('Cache-Control', `no-store, no-cache, must-revalidate`);
			ctx.set('Pragma', `no-cache`);

		} else {
			delete require.cache[key];
		}

		ctx.type = 'application/json';

		/* eslint-disable camelcase */
		ctx.body = {...require(key), start_url: ctx.query.from || '.'};
		/* eslint-enable camelcase */

		return;
	}

	return next();
};
