'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

import Chain from './core/chain';
import { controller } from './core/controller';

const
	$C = require('collection.js'),
	mongoose = require('mongoose');

const
	Methods = Symbol();

@controller(exports, {abstract: true})
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

		if (parent && event.isNotInitialized(parent.name)) {
			return event.wait(parent.name).then(() => new constr(...arguments));
		}

		const mBlacklist = {
			constructor: true
		};

		function filter(blacklist) {
			return (key) => !blacklist[key] && key[0] !== '_';
		}

		const
			name = this.constructor.name,
			methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).union(parent && parent[Methods] || []);

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

		constr[Methods] = methods;
	}
}
