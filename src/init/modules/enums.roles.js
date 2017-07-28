'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import { Role } from 'core/acl';

const
	$C = require('collection.js'),
	mongoose = require('mongoose'),
	EventEmitter = require('eventemitter2').EventEmitter2;

/**
 * Initializes system roles
 * @param [roleModel]
 */
export default async function (roleModel: string = 'Role') {
	const
		event = new EventEmitter({maxListeners: 100}),
		roles = await mongoose.model(roleModel).find({});

	const
		map = {},
		initialised = {};

	await $C(roles).async.forEach((el, i, data, o) => {
		o.wait(new Promise((resolve, reject) => {
			map[el._id] = map[el.name] = el.toJSON();

			const
				name = String(el._id);

			const init = (parent) => {
				try {
					initialised[name] = new Role([name, el.name], parent, ...el.permissions);
					event.emit(name, initialised[name]);
					resolve();

				} catch (err) {
					reject(err);
				}
			};

			if (el.parent && !initialised[el.parent]) {
				event.once(String(el.parent), init);
				return;
			}

			init(initialised[el.parent]);
		}));
	});

	return map;
};
