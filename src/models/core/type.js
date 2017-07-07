'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import joi from 'core/validation';

const
	$C = require('collection.js'),
	mongoose = require('mongoose');

export default class Type {
	/**
	 * @param schema
	 * @param [init] - true if instance is initialized (private parameter)
	 */
	constructor(schema: Object, init?: boolean) {
		this.map = schema.type ? schema : {type: schema};

		if (Object.isString(schema.joi)) {
			const nm = schema.joi;
			this.map.joi = () => joi.get(nm);
		}

		this.inited = Boolean(init);
	}

	/**
	 * Clones the schema
	 */
	get clone(): this {
		if (this.inited) {
			return this;
		}

		return new Type(Object.mixin(true, {}, this.map), true);
	}

	/**
	 * Forks the schema
	 */
	get fork(): this {
		return new Type(Object.mixin(true, {}, this.map), true);
	}

	/**
	 * Extends the schema by new schemas
	 * @param newSchema
	 */
	extend(...newSchema: Object): this {
		const obj = this.clone;
		Object.mixin(true, obj.map, ...$C(newSchema).map((el) => el instanceof Type ? el.map : el));
		return obj;
	}

	/**
	 * Extends the schema by new schemas without cloning
	 * @param newSchema
	 */
	unsafeExtend(...newSchema: Object): this {
		Object.mixin(true, this.map, ...$C(newSchema).map((el) => el instanceof Type ? el.map : el));
		return this;
	}

	/**
	 * Sets a setter for the schema
	 * @param value
	 */
	setter(value: Function): Type {
		const obj = this.clone;
		obj.map.set = value;
		return obj;
	}

	/**
	 * Sets the default value for the schema
	 * @param value
	 */
	def(value: any): this {
		const
			obj = this.clone,
			{map} = obj;

		if (map.joi && !Object.isFunction(value)) {
			const type = map.joi;
			obj.map.default = () => joi.validate(value, type()).value;

		} else {
			obj.map.default = value;
		}

		return obj;
	}

	/**
	 * Sets the schema default value to Date.now
	 */
	get now(): this {
		const obj = this.clone;
		obj.map.default = () => new Date();
		return obj;
	}

	/**
	 * Marks the schema as required
	 */
	get required(): this {
		const obj = this.clone;
		obj.map.required = true;
		return obj;
	}

	/**
	 * Marks the schema as nullable
	 */
	get null(): this {
		const
			obj = this.clone,
			{map} = obj;

		if (map.joi) {
			const type = map.joi;
			obj.map.joi = () => type().allow(null);
		}

		return obj;
	}

	/**
	 * Transforms the schema type to array
	 */
	get array(): this {
		const
			obj = this.clone,
			{map} = obj;

		obj.map = {
			type: [Object.isObject(map.type) ? map.type : map]
		};

		if (map.joi) {
			const type = map.joi;
			obj.map.joi = () => joi.alternatives().try(type().toArray(), joi.array().items(type()));
		}

		return obj;
	}

	/**
	 * Sets the schema index
	 * @param [type] - index type
	 */
	index(type?: string): this {
		const obj = this.clone;
		obj.map.index = type || true;
		return obj;
	}

	/**
	 * Sets the schema text index
	 */
	get text(): this {
		const obj = this.clone;
		obj.map.text = true;
		return obj;
	}

	/**
	 * Sets the schema sparse index
	 */
	get sparse(): this {
		const obj = this.clone;
		obj.map.sparse = true;
		return obj;
	}

	/**
	 * Sets the schema unique index
	 */
	get unique(): this {
		const obj = this.clone;
		obj.map.unique = true;
		return obj;
	}

	/**
	 * Returns an object of the schema
	 */
	get ok(): Object {
		return this.clone.map;
	}

	/**
	 * Returns mongoose.Schema instance
	 */
	get schema(): mongoose.Schema {
		return new mongoose.Schema(this.ok.type);
	}
}
