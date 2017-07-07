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

const
	{ObjectId} = mongoose.Types;

/**
 * Initializes default roles
 */
module.exports = async function () {
	const
		Role = mongoose.model('Role');

	if (await Role.count()) {
		return;
	}

	const p = $C(await mongoose.model('PermissionEnum').find({})).reduce((map, el) => {
		map[el.name] = el._id;
		return map;
	}, {});

	const admin = {
		_id: new ObjectId(),
		name: 'admin',
		permissions: [p.AdminAccess]
	};
};
