'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import * as enums from 'init/enums';

const
	$C = require('collection.js'),
	joi = require('joi'),
	boom = require('boom');

const
	enumsList = $C(Object.keys(enums)).filter((el) => el !== 'main').map(),
	{ObjectId} = require('mongoose').Types;

const extJoi = joi.extend([
	...$C(['array', 'boolean', 'binary', 'date', 'func', 'number', 'object', 'string']).map((name) => ({
		name,
		base: joi[name](),
		language: {
			toArray: 'is invalid array'
		},

		rules: [
			{
				name: 'toArray',

				/* eslint-disable no-unused-vars */

				setup(params) {
					this._flags.toArray = true;
				},

				/* eslint-enable no-unused-vars */

				validate(p, v, state, opts) {
					if (opts.convert && this._flags.toArray) {
						return [].concat(v !== undefined ? v : []);
					}

					if (!Object.isArray(v)) {
						return this.createError(`${name}.toArray`, {v}, state, opts);
					}

					return v;
				}
			}
		]
	})),

	{
		name: 'any',
		language: {
			toArray: 'is invalid array',
			enum: 'is invalid enum value',
			objectId: 'is invalid objectId string'
		},

		pre(v, state, opts) {
			if (opts.convert) {
				const
					flags = this._flags;

				if (flags.objectId) {
					try {
						v = ObjectId(v);

					} catch (_) {
						return this.createError('any.objectId', {v}, state, opts);
					}
				}

				if (flags.enum) {
					const l = enums[this._flags.enum];
					v = l[v] && l[v]._id;
				}
			}

			return v;
		},

		rules: [
			{
				name: 'toArray',

				/* eslint-disable no-unused-vars */

				setup(params) {
					this._flags.toArray = true;
				},

				/* eslint-enable no-unused-vars */

				validate(p, v, state, opts) {
					if (opts.convert && this._flags.toArray) {
						return [].concat(v !== undefined ? v : []);
					}

					if (!Object.isArray(v)) {
						return this.createError(`${name}.toArray`, {v}, state, opts);
					}

					return v;
				}
			},

			{
				name: 'objectId',

				/* eslint-disable no-unused-vars */

				setup(params) {
					this._flags.objectId = true;
				},

				/* eslint-enable no-unused-vars */

				validate(p, v, state, opts) {
					if (v instanceof ObjectId === false) {
						return this.createError('any.objectId', {v}, state, opts);
					}

					return v;
				}
			},

			...$C(enumsList).map((name) => ({
				name,

				/* eslint-disable no-unused-vars */

				setup(params) {
					this._flags.enum = name;
				},

				/* eslint-enable no-unused-vars */

				validate(p, v, state, opts) {
					if (v instanceof ObjectId === false) {
						return this.createError('any.enum', {v}, state, opts);
					}

					return v;
				}
			}))
		]
	}
]);

extJoi.toArray = () => extJoi.any().toArray();
extJoi.objectId = () => extJoi.any().objectId();
$C(enumsList).forEach((name) => extJoi[name] = () => extJoi.any()[name]());

const
	schemaName = Symbol();

export const
	cache = {};

/**
 * Validates data by the specified Joi schema
 *
 * @param data
 * @param schema - joi schema object
 * @param [params] - validation parameters
 */
boom.joi = async function (data: any, schema: joi, params?: Object): any {
	const hook = async (obj, validator) => {
		if (Object.isFunction(validator) || Object.isArray(validator)) {
			obj = await $C([].concat(validator)).async.reduce((res, fn) => {
				const val = fn.call(this, res, data);
				return val !== undefined ? val : res;
			}, obj);

		} else if (Object.isObject(obj)) {
			await $C(validator).async.forEach((fn, key, src, o) => {
				if (key in obj === false || !fn) {
					return;
				}

				o.wait($C([].concat(fn)).async.forEach(async (fn) => {
					const
						val = await fn.call(this, obj[key], key, obj, data);

					if (val !== undefined) {
						obj[key] = val;
					}
				}));
			});
		}

		return obj;
	};

	const obj = schema[schemaName];
	data = await hook(data, obj.$pre);

	const
		result = joi.validate(data, schema, params);

	if (result.error) {
		const {path, message} = result.error.details[0];
		throw boom.badRequest(message, {field: path});
	}

	return await hook(result.value, obj.$post);
};

/**
 * Gets a schema from the cache by the specified name
 *
 * @param name
 * @param [parent] - parent schema name (or an array of names) or a schema object/initializer
 * @param [schema] - schema initializer
 */
extJoi.get = function (
	name: string | Symbol,
	parent?: ?string | Symbol | Array<string | Symbol> | Object | Function,
	schema?: Function
): ?joi {
	if (cache[name]) {
		return cache[name].compiled;
	}

	if (!parent && !schema) {
		return;
	}

	const
		p = {$schema: {}, $pre: {}, $post: {}};

	if (Object.isFunction(parent)) {
		parent = parent();
	}

	if (Object.isObject(parent)) {
		Object.assign(p.$schema, parent.$schema);
		Object.assign(p.$pre, parent.$pre);
		Object.assign(p.$post, parent.$post);

	} else {
		const
			arr = [].concat(parent || []);

		for (let i = 0; i < arr.length; i++) {
			const
				obj = cache[arr[i]].schema;

			if (Object.isObject(p.$schema)) {
				if (Object.isObject(obj.$schema)) {
					Object.assign(p.$schema, obj.$schema);

				} else {
					p.$schema = obj.$schema;
				}

			} else {
				p.$schema.concat(joi.compile(obj.$schema));
			}

			Object.assign(p.$pre, obj.$pre);
			Object.assign(p.$post, obj.$post);
		}
	}

	let
		s = schema ? schema(p.$schema, {$pre: p.$pre, $post: p.$post}) : p;

	if (!s.$schema) {
		s = {$schema: s};
	}

	if (Object.isObject(s.$schema)) {
		const
			map = {},
			schema = s.$schema,
			keys = Object.keys(schema);

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			map[key] = extJoi.compile(schema[key]);
		}

		s.$schema = map;
	}

	if (!s.$pre) {
		s.$pre = {};
	}

	if (!s.$post) {
		s.$post = {};
	}

	const obj = cache[name] = {
		schema: s,
		compiled: extJoi.compile(s.$schema)
	};

	obj.compiled[schemaName] = s;
	return obj.compiled;
};

export default extJoi;
