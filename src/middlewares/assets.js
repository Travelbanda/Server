'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	config = require('config'),
	path = require('path');

const
	assetsRequest = /\/((\d+_)?assets\.js)$/,
	keyRgxp = /\.(js|css)$/,
	cache = Object.create(null);

/**
 * Assets JSONp
 */
module.exports = async function (ctx, next) {
	const
		assets = assetsRequest.exec(ctx.path);

	if (assets) {
		const
			// .js -> .json
			key = path.join(config.src.clientOutput(), `${assets[1]}on`);

		let body = cache[key];
		if (!body) {
			body = cache[key] = $C(require(key)).reduce((str, el: {js: any, css: any}, key) => {
				delete el[''];

				if (el.js || el.css) {
					str += `PATH['${key.replace(keyRgxp, '')}'] = '${el[Object.keys(el)[0]].split('/').slice(-1)[0]}';\n`;
				}

				return str;
			}, '');
		}

		if (isProd) {
			ctx.set('Cache-Control', `no-store, no-cache, must-revalidate`);
			ctx.set('Pragma', `no-cache`);

		} else {
			delete require.cache[key];
			delete cache[key];
		}

		ctx.type = 'text/javascript';
		ctx.body = body;
		return;
	}

	return next();
};
