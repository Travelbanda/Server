'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	mongoose = require('mongoose');

/**
 * Map of available languages
 */
export let lang: ?Object;

/**
 * Map of available permissions
 */
export let permission: ?Object;

/**
 * Map of available roles
 */
export let role: ?Object;

/**
 * Initializes enums
 */
export async function main() {
	if (this.isNotInitialized('predefs')) {
		return this.wait('predefs').then(() => main.call(this, ...arguments));
	}

	function reduce(map, el) {
		map[el._id] = map[el.name] = el.toJSON();
		return map;
	}

	await $C({
		LangEnum(el) {
			lang = el;
		},

		PermissionEnum(el) {
			permission = el;
		}

	}).async.forEach((init, model, data, o) => {
		o.wait(async () => {
			init(
				$C(await mongoose.model(model).find({})).reduce(reduce, {})
			);
		});
	});

	role = await require('./enums.roles')();
}
