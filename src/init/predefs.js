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
 * Initializes default enums
 * @param enums - map of enums for initialization
 */
export default async function (enums: ?Object) {
	await $C({...enums}).async.forEach((fields, model, data, o) => {
		o.wait(async () => {
			const
				Model = mongoose.model(model);

			await $C(fields).async.forEach((el, i, data, o) => {
				o.wait(async () => {
					if (!await Model.findOne({name: el.name})) {
						await Model.create(el, {unsafe: true, model: true});
					}
				});
			});
		});
	});
}
