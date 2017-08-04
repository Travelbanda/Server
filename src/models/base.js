'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Store from 'core/store';
import ModelConstructor from 'models/core/constructor';
import joi, { cache as schemaCache } from 'core/validation';
import { lang, role } from 'init/enums';
import { model, index, objectId, now } from 'models/core/model';
import { dataCache, timeCache } from 'models/core/cache';

const
	$C = require('collection.js'),
	boom = require('boom'),
	mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

const extraQueryFields = new Set([
	'page',
	'perPage',
	'sort',
	'dir',
	'date',
	'dateField',
	'keepTime'
]);

const
	updatePropertyRgxp = /^new(?=[A-Z])/;

export const
	$$ = new Store();

@model(module, {abstract: true})
export default class Base extends ModelConstructor {
	/**
	 * Id
	 */
	@objectId
	_id: ObjectId;

	/**
	 * Created date
	 */
	@index()
	@now
	createdDate: Date;

	/**
	 * Modified date
	 */
	@index()
	@now
	modifiedDate: Date;

	/**
	 * If true, the request may return all documents in a collection
	 */
	static allDocsRequest = false;

	/**
	 * The maximum value of perPage
	 */
	static maxPerPage = 500;

	/**
	 * The default value of perPage
	 */
	static defaultPerPage = 10;

	/**
	 * The default sort field
	 */
	static defaultSortField: ?string = null;

	/**
	 * The default sort order
	 */
	static defaultSortOrder = 'desc';

	/**
	 * The default date field
	 */
	static defaultDateField = 'createdDate';

	/**
	 * Data projection
	 */
	static projection = {__v: 0};

	/**
	 * List of private data for get
	 */
	static protectedFields = ['__v'];

	/**
	 * onSchemaCreated hook
	 *
	 * @protected
	 * @param schema
	 * @param params
	 * @param ctx
	 */
	__onSchemaCreated(schema: Schema, params: Object, ...ctx: Store) {
		// Runtime prototype injection:
		// feel the power of JavaScript :)
		if (ctx.length) {
			const
				constr = this.constructor,
				__proto__ = Object.getPrototypeOf(constr);

			if (!constr.hasOwnProperty('getFields')) {
				const ext = {
					__proto__,
					getFields(name) {
						const
							obj = {...super.getFields(name)};

						for (let i = 0; i < ctx.length; i++) {
							const c = schemaCache[ctx[i][name]];
							Object.assign(obj, c && c.schema);
						}

						return obj;
					}
				};

				Object.assign(constr, ext);
				schema.statics.getFields = ext.getFields;
			}

			if (!constr.hasOwnProperty('getQuery')) {
				const ext = {
					__proto__,
					getQuery(p) {
						return this.reduce(p, async (el, simple) => {
							if (simple !== false) {
								for (let i = 0; i < ctx.length; i++) {
									el = await this.joi(el, ctx[i].query);
								}
							}

							return super.getQuery(el);
						});
					}
				};

				Object.assign(constr, ext);
				schema.statics.getQuery = ext.getQuery;
			}
		}

		joi.get($$.query, null, () => ({
			...params.fields,
			_id: joi.get('objectIds')
		}));
	}

	/* eslint-disable no-unused-vars */

	/**
	 * onModelCreated hook
	 *
	 * @protected
	 * @param model
	 */
	__onModelCreated(model: Model) {}

	/* eslint-enable no-unused-vars */

	/**
	 * Returns a cache object to the specified model
	 * @param model
	 */
	static getCacheObject(model: string): Object {
		let
			cache = dataCache[model];

		if (!cache) {
			cache = {};
			dataCache[model] = cache;
		}

		return cache;
	}

	/**
	 * Adds a value by the specified id to the cache object
	 *
	 * @param cache
	 * @param id
	 * @param value
	 * @param [timeLabel]
	 */
	static addToCache(cache: Object, id: any, value: any, timeLabel?: Date | string = new Date().long()) {
		if (Object.isDate(timeLabel)) {
			timeLabel = timeLabel.long();
		}

		cache[id] = value;
		timeCache[timeLabel] = timeCache[timeLabel] || [];
		timeCache[timeLabel].push([id, cache]);
	}

	/**
	 * Returns a private store key by the specified name
	 *
	 * @param store - key store
	 * @param name - key name
	 */
	static getPrivateStoreKey(store: Store, name: string): Symbol {
		return store[`${name}_${this.modelName}`];
	}

	/**
	 * Returns a tuple with private store keys by the specified parameters
	 *
	 * @param store - key store
	 * @param name - key name
	 * @param parent - parent key name
	 */
	static getPrivateStoreKeys(store: Store, name: string, parent: string | Symbol): [Symbol, string | Symbol] {
		return [
			this.getPrivateStoreKey(store, name),
			Object.isString(parent) && parent[0] !== '&' ? this.getPrivateStoreKey(store, parent) : parent
		];
	}

	/**
	 * Updates one document by the the specified request and returns it
	 *
	 * @param conditions
	 * @param [data]
	 * @param [opts] - additional options
	 * @param [opts.model] - if true, then will be returned a model
	 * @param [opts.unsafe] - if true, then the data won't be filtered
	 * @param [opts.silentModify] - if true, then modifiedDate won't be updated by default
	 */
	static async findOneAndUpdate(conditions: Object, data?: Object = {}, opts?: Object = {}): ?Object | Base {
		data.$set = data.$set || {};

		if (!opts.silentModify) {
			data.$set.modifiedDate = data.$set.modifiedDate || new Date();
		}

		data.$inc = data.$inc || {};
		data.$inc.__v = 1;

		const f = async () => {
			const obj = await Object.getPrototypeOf(this).findOneAndUpdate.call(
				this,
				conditions,
				opts.unsafe ? data : await this.preUpdate(conditions, data),
				Object.reject(opts, ['model', 'unsafe', 'silentModify'])
			);

			if (opts.model) {
				return obj;
			}

			return obj && obj.toFullObject();
		};

		try {
			return await f();

		} catch (err) {
			if (err.message === "Cannot update '__v' and '__v' at the same time") {
				delete data.$inc.__v;

				if (!Object.keys(data.$inc).length) {
					delete data.$inc;
				}

				return f();
			}

			throw err;
		}
	}

	/**
	 * Updates documents
	 *
	 * @param conditions
	 * @param [data]
	 * @param [opts] - additional options
	 * @param [opts.unsafe] - if true, then the data won't be filtered
	 * @param [opts.silentModify] - if true, then modifiedDate won't be updated by default
	 */
	static async update(conditions: Object, data?: Object = {}, opts?: Object = {}): Object {
		data.$set = data.$set || {};

		if (!opts.silentModify) {
			data.$set.modifiedDate = data.$set.modifiedDate || new Date();
		}

		data.$inc = data.$inc || {};
		data.$inc.__v = 1;

		const f = async () => Object.getPrototypeOf(this).update.call(
			this,
			conditions,
			opts.unsafe ? data : await this.preUpdate(conditions, data),
			Object.reject(opts, ['unsafe', 'silentModify'])
		);

		try {
			return await f();

		} catch (err) {
			if (err.message === "Cannot update '__v' and '__v' at the same time") {
				delete data.$inc.__v;

				if (!Object.keys(data.$inc).length) {
					delete data.$inc;
				}

				return f();
			}

			throw err;
		}
	}

	/**
	 * Creates a new model
	 *
	 * @param data
	 * @param [opts] - additional options
	 * @param [opts.model] - if true, then will be returned a model
	 * @param [opts.unsafe] - if true, then the data won't be filtered
	 */
	static async create(data: Object, opts?: Object = {}): Object | Base {
		const
			obj = await Object.getPrototypeOf(this).create.call(this, opts.unsafe ? data : await this.preSave(data));

		if (opts.model) {
			return obj;
		}

		if (Object.isArray(obj)) {
			return $C(obj).async.map((el) => el.toFullObject());
		}

		return obj.toFullObject();
	}

	/**
	 * Pre update handler
	 *
	 * @param conditions
	 * @param data
	 */
	static async preUpdate(conditions: Object, data: Object): Object {
		const
			simple = $C(data).one.search((el, key) => key[0] === '$') === null;

		let
			res = {},
			unsafe = [''];

		if (!simple) {
			unsafe = [
				'$set',
				'$setOnInsert',
				'$unset',
				'$addToSet',
				'$push',
				'$pushAll'
			];

			res = Object.select(data, [
				'$pop',
				'$pull',
				'$pullAll',
				'$inc',
				'$rename',
				'$mul',
				'$min',
				'$max',
				'$currentDate'
			]);
		}

		await $C(unsafe).async.forEach((el, i, link, o) => {
			const
				obj = simple ? data : data[el];

			if (!obj) {
				return;
			}

			o.wait(async () => {
				const val = await this.joi(obj, ...this.getPrivateStoreKeys($$, 'preUpdate', '&queryUpdate'), (s, {$pre, $post}) => ({
					$schema: {
						...s,
						_id: joi.strip(),
						createdDate: joi.strip()
					},

					$pre,
					$post
				}));

				if (simple) {
					res = val;

				} else {
					res[el] = val;
				}
			});
		});

		return res;
	}

	/**
	 * Pre save handler
	 * @param data
	 */
	static preSave(data: Object | Array): Object | Array {
		if (Object.isArray(data)) {
			$C(data).set((el) => this.preSave(el));
			return data;
		}

		return this.joi(data, ...this.getPrivateStoreKeys($$, 'preSave', '&queryUpdate'), (s, {$pre, $post}) => ({
			$schema: {
				...s,
				_id: joi.strip(),
				createdDate: joi.strip()
			},

			$pre,
			$post
		}));
	}

	/**
	 * Validates a value by the specified Joi schema and returns new
	 * (base object won't modified)
	 *
	 * @param value
	 * @param schemaName
	 * @param [parentSchema] - parent schema name (or an array of names) or a schema object/initializer
	 * @param [initializer] - schema initializer
	 * @param [params] - validation parameters
	 */
	static async joi(
		value: any,
		schemaName: string | Symbol,
		parentSchema?: ?string | Symbol | Array<string | Symbol> | Object | Function,
		initializer?: Function,
		params?: Object
	): ?Object {
		if (!value) {
			return;
		}

		if (Object.isString(parentSchema) && parentSchema[0] === '&') {
			const nm = parentSchema.slice(1);
			parentSchema = () => this.getFields(nm);
		}

		const
			isObject = Object.isObject(value),
			isArray = Object.isArray(value);

		if (isObject) {
			value = {...value};

		} else if (isArray) {
			value = value.slice();
		}

		const
			schema = joi.get(schemaName, parentSchema, initializer),
			res = await boom.joi.call(this, value, schema, params || {allowUnknown: true});

		if (isObject || isArray) {
			Object.assign(value, res);

			const
				keys = Object.keys(value);

			for (let i = 0; i < keys.length; i++) {
				const
					key = keys[i];

				if (key in res === false) {
					delete value[key];
				}
			}

			return value;
		}

		return res;
	}

	/**
	 * Reduces request parameters to the valid form
	 *
	 * @param params - request parameters
	 * @param cb - callback function
	 */
	static async reduce(params: Object, cb: (el: Object, simple: ?boolean) => void): Object {
		const
			simple = !params.$or && !params.$and;

		let res;
		if (Object.keys(params).length > 1 || simple) {
			res = await cb(params, simple);
		}

		if (params.$or) {
			const $or = await $C(params.$or).async.reduce(async (query, el) => {
				const res = await cb(el);
				query.push(Object.isObject(res) ? res : el);
				return query;
			}, []);

			return {$or};
		}

		if (params.$and) {
			const $and = await $C(params.$and).async.reduce(async (query, el) => {
				const res = await cb(el);
				query.push(Object.isObject(res) ? res : el);
				return query;
			}, []);

			return {$and};
		}

		return res || {};
	}

	/**
	 * Removes update properties from the specified object
	 * @param obj
	 */
	static removePropertiesForUpdate(obj: Object): Object {
		$C(obj).remove((el, key) => updatePropertyRgxp.test(key));
		return obj;
	}

	/**
	 * Returns schema fields by the specified name
	 * @param name
	 */
	static getFields(name: string): Object {
		const obj = schemaCache && schemaCache[$$[name]];
		return {...obj && obj.schema};
	}

	/**
	 * Returns query parameters
	 * @param params - request parameters
	 */
	static getQuery(params: Object): Promise<Object> {
		return this.reduce(params, async (el) => {
			el = await this.joi(el, $$.query);

			const
				query = {};

			{
				const
					keys = Object.keys(el);

				for (let i = 0; i < keys.length; i++) {
					const
						key = keys[i],
						val = el[key];

					if (!extraQueryFields.has(key) && val !== undefined) {
						query[key] = val;
					}
				}
			}

			await this.initDateQuery(el, query);

			{
				const
					keys = Object.keys(query);

				for (let i = 0; i < keys.length; i++) {
					const
						key = keys[i],
						val = query[key];

					query[key] = Array.isArray(val) ? {$in: val} : val;
				}
			}

			return query;
		});
	}

	/**
	 * Returns an object with query and update properties from the specified
	 *
	 * @param obj
	 * @param [updFields] - map of update fields or a list
	 * @param [blacklist] - blacklist properties
	 */
	static getQueryForUpdate(obj: Object, updFields?: Object | Array, blacklist?: Array): {query: Object, upd: Object} {
		if (Object.isArray(updFields)) {
			updFields = Object.fromArray(updFields);

		} else {
			updFields = updFields || {};
		}

		const
			keys = Object.keys(obj),
			bl = blacklist && new Set(blacklist);

		const
			query = {},
			upd = {};

		for (let i = 0; i < keys.length; i++) {
			const
				key = keys[i],
				el = obj[key];

			if (updatePropertyRgxp.test(key)) {
				if (el !== undefined) {
					upd[key.replace(updatePropertyRgxp, '').camelize(false)] = el;
				}

			} else if (updFields[key]) {
				upd[updFields[key]] = el;

			} else if (!bl || !bl.has(key) && !updFields[key]) {
				query[key] = el;
			}
		}

		if (!Object.keys(upd).length) {
			throw boom.badRequest();
		}

		return {query: this.getQuery(query), upd};
	}

	/**
	 * Returns query parameters for smart text search
	 *
	 * @param search - search text
	 * @param query - base query
	 * @param fields - list of text fields ([field, model, query])
	 */
	static async getSmartSearchQuery(search: string, query: Object, fields: Array<Array>): {$or: Array<Object>} {
		search = await this.joi(search, $$.getSmartSearchQuery, null, () => joi.string());

		const or = {
			$or: []
		};

		await $C(fields).async.forEach(([field, model, q], i, data, o) => {
			const
				isArr = Object.isArray(field),
				models = [].concat(model);

			for (let i = 0; i < models.length; i++) {
				const
					el = models[i],
					Model = Object.isString(el) ? mongoose.model(el) : el;

				o.wait(async () => {
					const
						data = await Model.find({...q, $text: {$search: search}});

					if (or.$or.length && !data.length) {
						return;
					}

					const
						$in = [];

					for (let i = 0; i < data.length; i++) {
						$in.push(data[i][isArr ? field[1] || '_id' : '_id']);
					}

					or.$or.push({...query, [isArr ? field[0] : field]: {$in}});
				});
			}
		});

		return or;
	}

	/**
	 * Initializes paging parameters for the specified request
	 *
	 * @param query - query object
	 * @param req - mongoose.Query
	 */
	static async initPageRequest(query: Object, req: Query) {
		query = await this.joi(query, $$.initPageRequest, null, () => ({
			page: joi.number().integer().positive(),
			perPage: joi.number().integer().positive()
		}));

		if (!query.perPage && this.allDocsRequest) {
			return;
		}

		query.page = query.page || 1;
		query.perPage = query.perPage || this.defaultPerPage;

		if (this.maxPerPage && query.perPage > this.maxPerPage) {
			query.perPage = this.maxPerPage;
		}

		req.limit(query.perPage).skip((query.page - 1) * query.perPage);
	}

	/**
	 * Initializes sort parameters for the specified request
	 *
	 * @param query - query object
	 * @param req - mongoose.Query
	 */
	static async initSortRequest(query: Object, req: Query) {
		query = await this.joi(query, $$.initSortRequest, null, () => ({
			dir: joi.string(),
			sort: joi.string()
		}));

		if (!query.sort && !this.defaultSortField) {
			return;
		}

		query.dir = query.dir || this.defaultSortOrder;
		query.sort = query.sort || this.defaultSortField;
		req.sort({[query.sort]: query.dir});
	}

	/**
	 * Initializes date parameters for the specified query
	 *
	 * @param params - request parameters
	 * @param query - query object
	 */
	static async initDateQuery(params: Object, query: Object): Object {
		params = await this.joi(params, $$.initDateQuery, null, () => ({
			date: [joi.date(), joi.array().length(2).items(joi.date().allow(null, ''))],
			dateField: joi.string(),
			keepTime: joi.boolean()
		}));

		if (!params.date) {
			return;
		}

		const
			field = params.dateField = params.dateField || this.defaultDateField;

		const set = (d, m) => {
			d = d.clone();
			return params.keepTime ? d : d[m]();
		};

		const
			d = params.date;

		if (Object.isArray(d)) {
			if (d[0]) {
				query[field] = {
					$gte: set(d[0], 'beginningOfDay')
				};
			}

			if (d[1]) {
				query[field] = {
					$lte: set(d[1], 'endOfDay'),
					...query[field]
				};
			}

		} else {
			query[field] = {
				$gte: set(d, 'beginningOfDay'),
				$lte: set(d, 'endOfDay')
			};
		}

		return query;
	}

	/**
	 * Returns a list of data by the specified parameters
	 * @param [params]
	 */
	static async getList(params?: Object = {}): {data: Array, total: number, params: Object} {
		const
			query = await this.getQuery(params),
			request = this.find(query, this.projection);

		await Promise.all([
			this.initPageRequest(params, request),
			this.initSortRequest(params, request)
		]);

		const [data, total] = await Promise.all([
			$C(request.cursor()).iterator.async.reduce(async (arr, el) => {
				const obj = await el.toFullObject();
				obj && arr.push(obj);
				return arr;
			}, []),

			this.find(query).count()
		]);

		return {data, total, params: Object.reject(params, /^\$/)};
	}

	/**
	 * Updates the model
	 *
	 * @param data
	 * @param [opts] - additional options
	 */
	update(data: Object, opts?: Object): Promise<Base> {
		return this.constructor.findByIdAndUpdate(this._id, data, {...opts, new: true, model: true});
	}

	/**
	 * Joins fields to the specified object
	 *
	 * @param obj - source object
	 * @param fields - map of fields (field: model)
	 */
	async join(obj: Object, fields: Object): Object {
		const
			cache = Base.getCacheObject(this.modelName),
			now = new Date().long();

		await $C(fields).async.forEach((model, key, data, o) => {
			const
				id = obj[key];

			if (!id) {
				return;
			}

			let empty;
			if (Object.isObject(model)) {
				empty = model.empty;
				model = model.model;
			}

			const
				models = [].concat(model);

			for (let i = 0; i < models.length; i++) {
				const
					el = models[i],
					model = Object.isString(el) ? mongoose.model(el) : el;

				o.wait(async () => {
					if (Object.isArray(id)) {
						const
							ids = [];

						for (let i = 0; i < id.length; i++) {
							const
								el = id[i];

							if (el in cache === false) {
								ids.push(el);
							}
						}

						if (ids.length) {
							const q = model.find({
								[id[0] instanceof ObjectId ? '_id' : key]: {
									$in: ids
								}
							}, model.projection);

							await $C(q.cursor()).iterator.async.forEach(async (el) =>
								Base.addToCache(cache, el._id, await el.toFullObject(), now));
						}

						const
							newIds = [];

						for (let i = 0; i < id.length; i++) {
							const
								el = id[i];

							if (empty) {
								newIds.push(cache[el] != null ? cache[el] : empty(el));

							} else if (el in cache) {
								newIds.push(cache[el]);
							}
						}

						obj[key] = newIds;

					} else {
						if (id in cache === false) {
							const
								data = await model.findOne({[id instanceof ObjectId ? '_id' : key]: id});

							if (data) {
								Base.addToCache(cache, id, await data.toFullObject(), now);
							}
						}

						if (empty) {
							obj[key] = cache[id] != null ? cache[id] : empty(id);

						} else {
							obj[key] = cache[id];
						}
					}
				});
			}
		});

		return obj;
	}

	/**
	 * Humanizes db constants
	 *
	 * @param data - source data
	 * @param constant - constant name or an object with advanced parameters ({[constant]: {field, reject}})
	 */
	humanizeConstants(data: Object, ...constant: string | Object): Object {
		function f(name, field, p) {
			function g(val) {
				if (val && p && p.reject) {
					return Object.reject(val, p.reject);
				}

				return val;
			}

			switch (name) {
				case 'role':
					if (Object.isArray(field)) {
						const
							arr = [];

						for (let i = 0; i < field.length; i++) {
							arr.push(g(role[field[i]]));
						}

						return arr;
					}

					return g(role[field]);

				case 'lang':
					if (Object.isArray(field)) {
						const
							arr = [];

						for (let i = 0; i < field.length; i++) {
							const el = field[i];
							arr.push(g(lang[el] && lang[el].name));
						}

						return arr;
					}

					return g(lang[field] && lang[field].name);
			}
		}

		for (let i = 0; i < constant.length; i++) {
			let
				el = constant[i];

			if (Object.isObject(el)) {
				const
					key = Object.keys(el)[0];

				el = el[key];
				data[el.field] = f(key, data[el.field], el);

			} else {
				data[el] = f(el, data[el]);
			}
		}

		return data;
	}

	/**
	 * Converts the model to a full object with joins
	 */
	async toFullObject(): Object {
		return this.toJSON();
	}

	/**
	 * Converts the model object to a plain JS object
	 */
	toJSON(): Object {
		const
			fields = this.constructor.protectedFields,
			obj = this.toObject();

		for (let i = 0; i < fields.length; i++) {
			delete obj[fields[i]];
		}

		return obj;
	}
}
