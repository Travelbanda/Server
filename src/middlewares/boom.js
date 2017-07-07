'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	boom = require('boom');

/**
 * Adds Boom to the Koa context object
 */
module.exports = function (ctx, next): Promise {
	const
		map = {},
		keys = Object.keys(boom);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		map[key] = function (err) {
			if (err) {
				if (err.throwed) {
					ctx.throw(err.statusCode, err.message);
					return;
				}

				if (key === 'wrap' && !err.isBoom && err.name === 'ValidationError') {
					map.badRequest(err.message, err.errors);
					return;
				}
			}

			const {data, output} = boom[key](...arguments);
			$C(output.headers).forEach((el, key) => ctx.response.set(key, el));

			if (data) {
				Object.assign(output.payload, {data});
			}

			try {
				ctx.throw(output.statusCode, JSON.stringify(output.payload));

			} catch (err) {
				err.throwed = true;
				throw err;
			}
		};
	}

	ctx.boom = map;
	return next();
};
