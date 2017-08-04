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

const
	cache = Object.create(null);

/**
 * Returns a role object by the specified name
 * @param name
 */
export function role(name: string): ?Role {
	return cache[name] || null;
}

/**
 * Returns true if the specified roles has all permissions from one of permission groups
 *
 * @param roles
 * @param permissions
 */
export function test(roles: Array, permissions: Array): false | {key: string} {
	const
		allowed = {};

	for (let i = 0; i < roles.length; i++) {
		Object.assign(allowed, (role(roles[i]) || {}).permissions);
	}

	for (let i = 0; i < permissions.length; i++) {
		const
			el = permissions[i],
			key = Object.keys(el)[0],
			arr = el[key];

		let test = true;
		for (let i = 0; i < arr.length; i++) {
			if (!allowed[arr[i]]) {
				test = false;
				break;
			}
		}

		if (test) {
			return {key};
		}
	}

	return false;
}

export class Role {
	/**
	 * Role name
	 */
	name: string;

	/**
	 * Map of permissions
	 */
	permissions: Object;

	/**
	 * @param name - role name
	 * @param parent - parent role
	 * @param permissions - list of permissions
	 */
	constructor(name: string | Array<string>, parent: ?Role, ...permissions: any) {
		this.name = Object.isArray(name) ? name[1] : name;
		this.permissions = {...parent && parent.permissions, ...Object.fromArray(permissions)};
		$C([].concat(name || [])).forEach((name) => cache[name] = this);
	}

	toString(): string {
		return this.name;
	}

	/**
	 * Returns true if the role has all permissions from one of permission groups
	 * @param permissions
	 */
	test(permissions: Object): false | {key: any} {
		const
			keys = Object.keys(permissions);

		for (let i = 0; i < keys.length; i++) {
			const
				key = keys[i],
				el = permissions[key];

			let test = true;
			for (let i = 0; i < el.length; i++) {
				if (!this.permissions[el[i]]) {
					test = false;
					break;
				}
			}

			if (test) {
				return {key};
			}
		}

		return false;
	}
}
