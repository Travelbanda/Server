'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Type from 'models/core/type';
import { objectId as objectIdType } from 'models/core/types';

const
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	mongoose = require('mongoose');

const
	{Mixed} = mongoose.Schema.Types;

export const
	fields = {},
	mixins = {statics: {}, methods: {}},
	initEvent = new EventEmitter2({maxListeners: 1e3});

/**
 * Defines a model
 *
 * @decorator
 * @param exports - exports object
 * @param [opts] - additional options
 */
export function model(exports, opts?: Object = {}) {
	return (target) => {
		const
			name = target.name,
			parent = Object.getPrototypeOf(target),
			hasParent = fields[parent.name];

		fields[name] = {};
		initEvent.emit('model', name);

		if (hasParent) {
			Object.setPrototypeOf(fields[name], fields[parent.name]);
		}

		exports.main = async function () {
			const obj = await new target(fields[name], opts, {
				event: this,
				parent: hasParent && parent
			});

			if (obj.__onSchemaCreated) {
				obj.__onSchemaCreated(obj.schema, {
					name,
					fields: obj.fields
				});
			}

			if (!opts.abstract) {
				const
					Model = mongoose.model(name, obj.schema, name.dasherize());

				if (obj.__onModelCreated) {
					obj.__onModelCreated(Model, {name, fields: obj.fields});
				}

				return Model;
			}

			return null;
		};

		exports.main.eventName = target.name;
	};
}

/**
 * Defines a schema field
 *
 * @decorator
 * @param required - true if the field is required
 */
export function prop(required: boolean) {
	return (target, key, desc) => {
		initEvent.once('model', (model) => {
			let def = desc.initializer();
			if (Object.isObject(def) || Object.isArray(def)) {
				def = new Function(`return ${JSON.stringify(def)}`);
			}

			fields[model][key] = new Type({
				type: Mixed,
				default: def,
				required
			});
		});
	};
}

function factory(value, method) {
	return (target, key) => {
		initEvent.once('model', (model) => {
			const
				m = fields[model],
				o = m[key];

			if (Object.isFunction(m[key] = o[method])) {
				m[key] = o[method](value);
			}
		});
	};
}

/**
 * Sets the specified type for a schema field
 *
 * @decorator
 * @param type
 */
export function type(type: Object | Type) {
	return factory(type, 'unsafeExtend');
}

/**
 * Sets the specified setter for a schema field
 *
 * @decorator
 * @param value
 */
export function setter(value: Function) {
	return factory(value, 'setter');
}

/**
 * Sets the specified default value for a schema field
 *
 * @decorator
 * @param value
 */
export function def(value: any) {
	return factory(value, 'def');
}

/**
 * Sets the schema field default value to Date.now
 * @decorator
 */
export const now = factory(undefined, 'now');

/**
 * Sets the schema field default value to ObjectId
 * @decorator
 */
export const objectId = type(objectIdType.def(mongoose.Types.ObjectId));

/**
 * Marks a schema field as required
 * @decorator
 */
export const required = factory(undefined, 'required');

/**
 * Transforms a schema field to array
 * @decorator
 */
export const array = factory(undefined, 'array');

/**
 * Sets the specified index for a schema field
 *
 * @decorator
 * @param value
 */
export function index(value?: string) {
	return factory(value, 'index');
}

/**
 * Sets the text index for a schema field
 * @decorator
 */
export const text = factory(undefined, 'text');

/**
 * Sets the sparse index for a schema field
 * @decorator
 */
export const sparse = factory(undefined, 'sparse');

/**
 * Sets the unique index for a schema field
 * @decorator
 */
export const unique = factory(undefined, 'unique');

/**
 * Marks a static property as mixin
 * @decorator
 */
export function mixin(target, key, desc) {
	initEvent.once('model', (model) => {
		const cache = Object.isFunction(target) ? mixins.statics : mixins.methods;
		cache[model] = mixins[model] || {};
		cache[model][key] = desc.initializer ? desc.initializer() : desc.value;
	});
}
