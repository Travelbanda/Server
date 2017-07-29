'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import { VERSION } from 'core/const/db';

const
	$C = require('collection.js'),
	config = require('config');

const
	mongoose = require('mongoose'),
	path = require('path'),
	glob = require('glob');

/**
 * Executes DB migration scripts
 * @param [counterModel]
 */
export default async function (counterModel: string = 'Counter') {
	const
		Counter = mongoose.model(counterModel),
		dbVersion = (await Counter.findOne({key: 'dbVersion'}) || {}).i || 0;

	if (dbVersion !== VERSION) {
		const
			i = (src) => parseInt(path.basename(src)),
			files = glob.sync(path.join(config.src.server[0], './patches/*.js')).sort((a, b) => i(a) - i(b));

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
}
