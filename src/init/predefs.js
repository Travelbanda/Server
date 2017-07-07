'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import { VERSION } from 'core/const/db';

const
	$C = require('collection.js'),
	mongoose = require('mongoose'),
	path = require('path'),
	glob = require('glob');

/**
 * Initializes default enums
 */
export async function main() {
	const
		Counter = mongoose.model('Counter'),
		dbVersion = (await Counter.findOne({key: 'dbVersion'}) || {}).i || 0;

	if (dbVersion !== VERSION) {
		const
			i = (src) => parseInt(path.basename(src)),
			files = glob.sync(path.join(__dirname, './patches/*.js')).sort((a, b) => i(a) - i(b));

		await $C(files).async.forEach(async (file) => {
			const
				pos = i(file);

			if (!isNaN(pos) && pos > dbVersion) {
				console.log(`Applying the DB patch #${pos}...`);
				await require(file)();
				await Counter.update({key: 'dbVersion'}, {$inc: {i: 1}}, {unsafe: true, upsert: true});
				console.log(`DB successfully updated to version #${pos}!`);
			}
		});
	}

	await $C({
		LangEnum: [
			{name: 'ru'},
			{name: 'en'},
			{name: 'es'},
			{name: 'it'},
			{name: 'fr'},
			{name: 'de'},
			{name: 'zh'}
		],

		PermissionEnum: [
			{name: 'AdminAccess'}
		]

	}).async.forEach((fields, model, data, o) => {
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

	await require('./predefs.roles')();
}
