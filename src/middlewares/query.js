'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	arrRgxp = /\[]$/;

/**
 * Query parser middleware
 */
module.exports = async function (ctx, next) {
	if (ctx.query) {
		const
			map = {},
			keys = Object.keys(ctx.query);

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			map[key.replace(arrRgxp, '')] = ctx.query[key];
		}

		ctx.query = map;
	}

	return next();
};
