'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	$C = require('collection.js');

export const
	dataCache = {},
	timeCache = {};

// Cache invalidation
$C(infinity).async.forEach(async (el, i, data, o) => {
	const
		timeout = (30).seconds();

	const
		now = Date.now();

	$C(timeCache).forEach((el, key) => {
		const
			date = Date.create(key);

		if (now - date.valueOf() > timeout) {
			$C(el).forEach(([id, cache]) => {
				delete cache[id];
			});
		}
	});

	await o.sleep(timeout);
});
