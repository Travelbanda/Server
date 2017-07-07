'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Store from 'core/store';
import { mixins } from './model';

const
	$C = require('collection.js'),
	mongoose = require('mongoose'),
	config = require('config');

export const
	$$ = new Store();

export default class ModelConstructor {
	/**
	 * @param fields - schema fields
	 * @param opts - additional schema options
	 * @param parent - link to the parent constructor
	 * @param event - link to the event object of the initializer
	 */
	constructor(fields: Object, opts: Object, {parent, event}: {parent?: Function, event: EventEmitter2}) {
		const
			constr = this.constructor,
			proto = Object.getPrototypeOf(this),
			parentName = parent && parent.name;

		if (parent && event.isNotInitialized(parentName)) {
			return event.wait(parentName).then(() => new constr(...arguments));
		}

		const {name} = constr;
		mixins.statics[name] = mixins.statics[name] || {};
		mixins.methods[name] = mixins.methods[name] || {};

		this.fields = $C(fields).reduce((schema, el, key) => {
			const
				map = el.fork.ok;

			if (map && map.joi) {
				schema[key] = map.joi();
			}

			return schema;
		}, {});

		const schema = new mongoose.Schema(
			$C(fields).object(true).reduce((map, el, key) => (map[key] = el.fork.ok, map), {}),
			{_id: false, autoIndex: config.db.autoIndex, ...opts}
		);

		const sBlacklist = {
			prototype: true,
			name: true,
			length: true
		};

		const mBlacklist = {
			constructor: true
		};

		function getPropertyDescriptor(obj, key) {
			if (!obj) {
				return {};
			}

			if (obj.hasOwnProperty(key)) {
				return Object.getOwnPropertyDescriptor(obj, key);
			}

			return getPropertyDescriptor(Object.getPrototypeOf(obj), key);
		}

		function filter(blacklist) {
			return (key) => !blacklist[key] && key[0] !== '_';
		}

		function add(obj, map) {
			return (key) => {
				const
					{get, set} = getPropertyDescriptor(obj, key);

				let
					el,
					cache;

				if (get || set) {
					if (map === schema.methods) {
						const
							v = schema.virtual(key);

						if (get) {
							v.get(get);
						}

						if (set) {
							v.set(set);
						}

					} else {
						Object.defineProperty(map, key, {get, set});
					}

				} else {
					el = obj[key];

					switch (map) {
						case schema.statics:
							cache = mixins.statics;
							break;

						case schema.methods:
							cache = mixins.methods;
							break;
					}
				}

				if (cache && !Object.isFunction(el)) {
					let
						mixin = cache[name][key];

					if (mixin && parent) {
						const
							parentProp = cache[parent.name][key];

						if (parentProp) {
							if (Object.isArray(parentProp) && Object.isArray(mixin)) {
								mixin = parentProp.union(mixin);

							} else {
								mixin = Object.mixin({deep: true, concatArray: true}, {}, parentProp, mixin);
							}
						}
					}

					cache[name][key] = obj[key] = map[key] = mixin || el;
					return;
				}

				if (map === schema.methods && /^(pre|post)(?=[A-Z])/.test(key)) {
					const m = RegExp.$1;
					schema[m](key[m.length].toLowerCase() + key.slice(m.length + 1), el);
					return;
				}

				if (!get && !set) {
					map[key] = el;
				}
			};
		}

		const s = schema.statics = {
			get modelName() {
				return name;
			}
		};

		const m = schema.methods = {};
		schema.virtual('modelName').get(() => name);

		const
			statics = Object.getOwnPropertyNames(constr).union(parent && parent[$$.Statics] || []);

		$C(statics).filter(filter(sBlacklist)).forEach(add(constr, s));
		constr[$$.Statics] = statics;

		const
			methods = Object.getOwnPropertyNames(proto).union(parent && parent[$$.Methods] || []);

		$C(methods).filter(filter(mBlacklist)).forEach(add(proto, m));
		constr[$$.Methods] = methods;

		this.schema = schema;
	}
}
