'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import models from 'core/init';

const
	mongoose = require('mongoose'),
	db = require('config').db;

module.exports = async () => {
	mongoose.Promise = Promise;

	const
		login = db.username ? `${db.username}:${db.password}@` : '',
		connection = db.uri || `mongodb://${login}${db.host}:${db.port}/${db.database}`;

	await mongoose.connect(connection, {...db.options, autoIndex: !isProd || Boolean(process.env.CREATE_INDEX)});
	return models(module)();
};
