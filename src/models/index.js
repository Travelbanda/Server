'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import models from 'core/init';

const
	mongoose = require('mongoose'),
	db = require('config').db;

/**
 * Initializes models
 */
module.exports = async () => {
	mongoose.Promise = Promise;

	const
		login = db.username ? `${db.username}:${db.password}@` : '',
		connection = db.uri || `mongodb://${login}${db.host}:${db.port}/${db.database}`;

	await mongoose.connect(connection, {
		...db.options,
		autoIndex: process.env.NODE_ENV !== 'production' || Number(process.env.CREATE_INDEX)
	});

	return models(module.parent)();
};
