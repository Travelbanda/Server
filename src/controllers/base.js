'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Store from 'core/store';
import Chain from 'controllers/core/chain';
import { controller } from 'controllers/core/controller';

const
	$C = require('collection.js'),
	mongoose = require('mongoose');

export const
	$$ = new Store();

@controller(module, {abstract: true})
export default class Base {
	/**
	 * @param router - Router instance
	 * @param opts - additional controller options
	 * @param parent - link to the parent constructor
	 * @param event - link to the event object of the initializer
	 */
	constructor(router: Router, opts: Object, {parent, event}: {parent?: Function, event: EventEmitter2}) {
		const
			constr = this.constructor;

		if (parent && parent.file && event.isNotInitialized(parent)) {
			return event.wait(parent, parent.file).then(() => new constr(...arguments));
		}

		const mBlacklist = {
			constructor: true
		};

		function filter(blacklist) {
			return (key) => !blacklist[key] && key[0] !== '_';
		}

		const
			name = this.constructor.name,
			methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).union(parent && parent[$$.methods] || []);

		if (!opts.abstract) {
			let Model;
			if (opts.model !== false) {
				if (Object.isString(opts.model)) {
					Model = mongoose.model(opts.model);

				} else {
					Model = mongoose.model(name);
				}
			}

			$C(methods).filter(filter(mBlacklist)).forEach((key) => {
				if (/^(\w+):(.*)/.test(key)) {
					const
						method = RegExp.$1,
						path = RegExp.$2.replace(/^(?=[^/]|$)/, `/${name.dasherize()}/`);

					const o = new Chain();
					this[key](o, Model);

					router[method](`/api${path}`, ...o.toArray());
				}
			});
		}

		constr[$$.methods] = methods;
	}
}
