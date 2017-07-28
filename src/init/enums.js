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
	mongoose = require('mongoose');

/**
 * Initializes enums
 * @param [models] - map of additional models for initialization
 */
export async function main(models?: Object) {
	if (this.isNotInitialized('predefs')) {
		return this.wait('predefs').then(() => main.call(this, ...arguments));
	}

	function reduce(map, el) {
		map[el._id] = map[el.name] = el.toJSON();
		return map;
	}

	await $C({...models}).async.forEach((init, model, data, o) => {
		o.wait(async () => {
			init($C(await mongoose.model(model).find({})).reduce(reduce, {}));
		});
	});
}
