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
 * Initializes default roles
 *
 * @param [roleModel]
 * @param [permissionModel]
 */
export default async function (
	{roleModel = 'Role', permissionModel = 'PermissionEnum'}: {
		roleModel?: string,
		permissionModel?: string
	} = {}

): {
	roles: Object,
	permissions: Object,
	create(): Promise
} {

	const
		Role = mongoose.model(roleModel);

	if (await Role.count()) {
		return;
	}

	const p = $C(await mongoose.model(permissionModel).find({})).reduce((map, el) => {
		map[el.name] = el._id;
		return map;
	}, {});

	return {
		roles: {},
		permissions: p,
		create() {
			return Role.create(
				$C(this.roles).get(),

				{
					unsafe: true,
					model: true
				}
			)
		}
	};
};
