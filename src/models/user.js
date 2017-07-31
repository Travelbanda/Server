'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Base, { $$ as $$base } from 'models/base';
import Type from 'models/core/type';
import Store from 'core/store';
import joi from 'core/validation';
import { model, mixin, type, index } from 'models/core/model';
import { permission, role } from 'init/enums';
import { notifyServer } from 'sockets/core/notify';
import { test } from 'core/acl';
import * as _ from 'models/core/types';

const
	$C = require('collection.js'),
	mongoose = require('mongoose'),
	config = require('config'),
	promisify = require('promisify-any'),
	request = require('request-promise-native'),
	boom = require('boom');

export const
	$$ = new Store();

const
	jwt = require('jsonwebtoken'),
	jwtRgxp = /^Bearer /;

let {randomBytes, pbkdf2} = require('crypto');
randomBytes = promisify(randomBytes, 1);
pbkdf2 = promisify(pbkdf2, pbkdf2.length - 1);

export const
	XSRF_EXPIRES = (10).minutes(),
	JWT_SECRET = new Buffer('d184ac4aabe0cb6fa9905c2bf17e8639bea552ecb867d0d5132fd9cf5b9039ed', 'hex');

const
	KEY_LENGTH = 256,
	SALT_LENGTH = 37,
	SALT = new Buffer('5d5ff33c4bd4355d0b66ec858bd2da9dda0368eafcb5768d630d33a41b79ef90', 'hex'),
	ITERATIONS = 1e4,
	DIGEST = 'sha512',
	PBKDF2 = [ITERATIONS, KEY_LENGTH, DIGEST];

const xsrf = new Type({
	value: _.string.required.ok,
	createdDate: _.date.now.ok
});

const token = new Type({
	value: _.string.index().required.ok,
	xsrf: xsrf.ok,
	prevXsrf: xsrf.ok,
	deviceToken: _.description.ok
});

@model(module, {abstract: true})
export default class User extends Base {
	/**
	 * Delete status
	 */
	@type(_.boolean)
	deleted: boolean = false;

	/**
	 * Verification status
	 */
	@type(_.boolean)
	verified: boolean = true;

	/**
	 * Online status
	 */
	@type(_.boolean)
	online: boolean = false;

	/**
	 * Last online date
	 */
	@type(_.date)
	lastOnlineDate: ?Date;

	/**
	 * User login
	 */
	@index()
	@type(_.nameId)
	login: string;

	/**
	 * User readable login
	 */
	@type(_.specialName)
	name: string;

	/**
	 * User first name
	 */
	@type(_.name)
	fName: ?string;

	/**
	 * User middle name
	 */
	@type(_.optionalName)
	mName: ?string;

	/**
	 * User last name
	 */
	@type(_.name)
	lName: ?string;

	/**
	 * User emails
	 */
	@index()
	@type(new Type({value: _.email.ok}).array)
	emails: Array<{value: string}> = [];

	/**
	 * User phone numbers
	 */
	@type(new Type({value: _.phone.ok}).array)
	phones: Array<{value: string}> = [];

	/**
	 * User roles
	 */
	@type(_.role.array)
	roles: Array<ObjectId> = [];

	/**
	 * User default language
	 */
	@type(_.lang)
	lang: ?ObjectId;

	/**
	 * User password
	 */
	@type(_.binary)
	password: Buffer;

	/**
	 * User password salt
	 */
	@type(_.binary)
	salt: Buffer;

	/**
	 * Session tokens
	 */
	@type(token.array)
	tokens: Array<Object> = [];

	/** @override */
	static allDocsRequest = true;

	/** @override */
	@mixin
	static protectedFields = ['password', 'salt', 'tokens'];

	/** @override */
	__onSchemaCreated(schema: Schema, params: Object) {
		super.__onSchemaCreated(
			...arguments,
			$$
		);

		schema.index({
			'phones.value': 'text',
			'emails.value': 'text',
			'name': 'text',
			'fName': 'text',
			'mName': 'text',
			'lName': 'text'
		});

		joi.get($$.query, $$base.query, (s, p) => ({
			$schema: {
				...params.fields,
				emails: joi.get('emails'),
				phones: joi.get('phones'),
				roles: joi.get('roles'),
				lang: joi.get('langs'),
				password: joi.strip(),
				salt: joi.strip(),
				tokens: joi.strip()
			},

			...p
		}));

		joi.get($$.queryUpdate, $$.query, (s, {$pre, $post: p}) => ({
			$schema: {
				...params.fields,
				name: joi.strip(),
				emails: joi.get('emails'),
				phones: joi.get('phones'),
				password: joi.get('password')
			},

			$pre,
			$post: {
				...p,

				async login(value, key, data, src) {
					if (await this.isUserExists(value)) {
						throw boom.conflict(l`User with this name is already registered`);
					}

					data.name = src.login.trim();
					return value;
				},

				async password(value, key, data) {
					data.salt = await randomBytes(SALT_LENGTH);
					return await pbkdf2(value, Buffer.concat([SALT, data.salt]), ...PBKDF2);
				},

				async emails(value) {
					if (await this.isEmailExists(value)) {
						throw boom.conflict(l`This email is already registered`);
					}

					return Object.mapToValue(value);
				},

				phones(value) {
					return Object.mapToValue(value);
				}
			}
		}));
	}

	/**
	 * Returns true if the the specified email is already exists in the DB
	 * @param email
	 */
	static async isEmailExists(email: string | Array<string>): boolean {
		email = await this.joi(email, $$.isEmailExists, $$.query, (s) => s.emails.required());
		return Boolean(await this.findOne({'emails.value': {$in: email}}, {_id: 1}));
	}

	/**
	 * Returns true if the the specified user is already exists in the DB
	 * @param login
	 */
	static async isUserExists(login: string): boolean {
		login = await this.joi(login, $$.isUserExists, $$.query, (s) => s.login.required());
		return Boolean(await this.findOne({login}, {_id: 1}));
	}

	/** @override */
	static getQuery(params: Object): Promise<Object> {
		return this.reduce(params, async (el, simple) => {
			if (simple === false) {
				return super.getQuery(el);
			}

			el = await this.joi(el, $$.query);

			const
				query = Object.reject(await super.getQuery(el), ['emails', 'phones']);

			if (query.deleted === undefined) {
				query.deleted = false;
			}

			$C(['emails', 'phones']).forEach((field) => {
				const
					q = el[field];

				if (q) {
					query[`${field}.value`] = Object.isArray(q) ? {$in: q} : q;
				}
			});

			return query;
		});
	}
	/**
	 * Sign up a user
	 * @param data
	 */
	static async reg(data: {login: string, password: string, email: string, pin: number}): {jwt: string, xsrf: string} {
		data = await this.joi(data, $$.regUser, $$.queryUpdate, (s, {$pre, $post: p}) => ({
			$schema: {
				login: s.login,
				password: s.password,
				email: joi.get('email'),
				pin: joi.number()
			},

			$pre,
			$post: {
				...p,
				async email(value, key, data) {
					data.emails = await p.emails.call(this, ...arguments);
				}
			}

		}), {presence: 'required'});

		const
			user = await this.create(data, {unsafe: true, model: true}),
			jwt = await user.addSessionToken(),
			xsrf = await user.setXsrf(jwt);

		return {
			_id: user._id,
			user: await user.toFullObject(),
			jwt,
			xsrf
		};
	}

	/**
	 * Sign in a user by the specified login and the password
	 *
	 * @param data
	 * @param data.login
	 * @param data.password
	 * @param [data.deviceToken]
	 */
	static async login(data: {login: string, password: string, deviceToken?: string}): {_id: ObjectId, jwt: string, xsrf: string} {
		data = await this.joi(data, $$.login, $$.queryUpdate, (s) => ({
			login: s.login.required(),
			password: s.password.required(),
			deviceToken: joi.get('description')
		}));

		const
			user = await this.findOne({login: data.login});

		if (!user || await user.comparePassword(data.password) === false) {
			throw boom.badData(l`Invalid login or password`);
		}

		if (!user.verified) {
			throw boom.forbidden(l`Your account has not been verified yet! Please try again later.`);
		}

		const
			jwt = await user.addSessionToken(data.deviceToken),
			xsrf = await user.setXsrf(jwt);

		return {
			_id: user._id,
			user: await user.toFullObject(),
			jwt,
			xsrf
		};
	}

	/**
	 * Sign out a user by the specified id
	 *
	 * @param id
	 * @param authToken
	 */
	static logout(id: ObjectId, authToken: string): Promise<Object> {
		return this.findByIdAndUpdate(id, {
			$pull: {
				tokens: {
					value: authToken.replace(jwtRgxp, '')
				}
			}
		});
	}

	/**
	 * Authorizes a user by the specified token and returns the session object
	 *
	 * @param authToken
	 * @param xsrfToken
	 * @param permissions
	 */
	static async authorize(
		authToken: string,
		xsrfToken: string,
		permissions?: Array<Object | string> | Object<string> | string
	): Object {
		const
			session = {};

		try {
			authToken = authToken.replace(jwtRgxp, '');

			const
				{id} = jwt.verify(authToken, JWT_SECRET),
				cache = User.getCacheObject('sessions');

			if (!cache[authToken]) {
				User.addToCache(cache, authToken, await this.findOne({'tokens.value': authToken}), Date.create('5 minutes from now'));
			}

			const
				user = cache[authToken];

			if (!user._id.equals(id)) {
				throw true;
			}

			session.user = user;

		} catch (_) {
			throw boom.unauthorized(l`Invalid authorization token`);
		}

		const
			newXsrf = await session.user.validateXsrf(authToken, xsrfToken);

		if (newXsrf !== xsrfToken) {
			session.xsrf = newXsrf;
		}

		if (permissions && Object.keys(permissions).length) {
			const
				permission = session.user.hasPermissions(permissions);

			if (!permission) {
				throw boom.forbidden(null, {xsrf: session.xsrf});
			}

			session.permissionGroup = permission.key;
		}

		return session;
	}

	/**
	 * Sets new information for the specified user
	 * @param params
	 */
	static async set(params: Object): Object {
		let $set;
		const query = await this.reduce(params, async (el, simple) => {
			if (simple === false) {
				return;
			}

			el = await this.joi(el, $$.set, null, () => ({
				_id: joi.required(),
				newLogin: joi.string(),
				newFName: joi.string(),
				newMName: joi.get('optionalName'),
				newLName: joi.string(),
				newEmails: joi.get('strings'),
				newRoles: joi.get('strings'),
				newLang: joi.string(),
				newPassword: joi.string()
			}));

			const q = this.getQueryForUpdate(el);
			$set = q.upd;
			return q.query;
		});

		const
			user = await this.findOneAndUpdate(query, {$set}, {new: true});

		if (!user) {
			throw boom.badData();
		}

		return user;
	}

	/**
	 * Removes the specified user
	 * @param params
	 */
	static async unset(params: Object): Object {
		params = await this.joi(params, $$.unset, null, () => ({
			_id: joi.objectId().required()
		}));

		const user = await this.findOneAndUpdate(await this.getQuery(params), {
			$set: {
				deleted: true,
				emails: []
			},

			$unset: {
				login: true
			}

		}, {unsafe: true});

		if (!user) {
			throw boom.badData();
		}

		return user;
	}

	/**
	 * Sends an event to users by the specified request
	 *
	 * @param event - event name or a list of names
	 * @param data - event data
	 * @param query - request query
	 * @param filter - data filter
	 */
	static async sendEvent(event: string | Array<string>, data: Object, query?: Object, filter?: (user: User) => boolean) {
		const
			obj = {};

		await $C(this.find(query).cursor()).iterator.async.forEach((user) => {
			if (filter && !filter(user)) {
				return;
			}

			user.addToEvent(obj);
		});

		$C([].concat(event)).forEach((event) => obj.send && obj.send(event, data));
	}

	/* eslint-disable no-unused-vars */

	/**
	 * Sends a deferred event to users by the specified request
	 *
	 * @param event - event name
	 * @param data - event data
	 * @param query - request query
	 * @param filter - data filter
	 */
	static sendDeferEvent(event: string | Array<string>, data: Object, query?: Object, filter?: (user: User) => boolean): Promise {
		const args = arguments;
		return new Promise((resolve, reject) => {
			setImmediate(async () => {
				try {
					resolve(await this.sendEvent(...args));

				} catch (err) {
					reject(err);
				}
			});
		});
	}

	/* eslint-enable no-unused-vars */

	/**
	 * Sends a push to users by the specified request
	 *
	 * @param event - push name
	 * @param data - push data
	 * @param query - request query
	 * @param filter - data filter
	 */
	static async sendPush(event: string, data: Object, query?: Object, filter?: (user: User) => boolean) {
		const
			obj = {};

		await $C(this.find(query).cursor()).iterator.async.forEach((user) => {
			if (filter && !filter(user)) {
				return;
			}

			user.addToPush(obj);
		});

		return obj.send && obj.send(event, data);
	}

	/* eslint-disable no-unused-vars */

	/**
	 * Sends a deferred push to users by the specified request
	 *
	 * @param event - event name
	 * @param data - event data
	 * @param query - request query
	 * @param filter - data filter
	 */
	static sendDeferPush(event: string, data: Object, query?: Object, filter?: (user: User) => boolean): Promise {
		const args = arguments;
		return new Promise((resolve, reject) => {
			setImmediate(async () => {
				try {
					resolve(await this.sendPush(...args));

				} catch (err) {
					reject(err);
				}
			});
		});
	}

	/* eslint-enable no-unused-vars */

	/**
	 * Sign out the user
	 * @param authToken
	 */
	logout(authToken: string): Promise<User> {
		return this.constructor.logout(this._id, authToken);
	}

	/**
	 * Returns true if the user has all permissions from one of the specified permission groups
	 * @param permissions
	 */
	hasPermissions(permissions: Array<Object | string> | Object<string> | string): false | {key: string} {
		if (Object.isString(permissions)) {
			permissions = [{[permissions]: permissions}];

		} else if (Object.isObject(permissions)) {
			permissions = [permissions];

		} else if (Object.isArray(permissions) && Object.isString(permissions[0])) {
			permissions = [{[permissions[0]]: permissions}];
		}

		const
			arr = [];

		for (let i = 0; i < permissions.length; i++) {
			const
				el = permissions[i],
				key = Object.keys(el)[0];

			const
				values = [].concat(el[key] || []),
				newValues = [];

			for (let i = 0; i < values.length; i++) {
				const el = values[i];
				newValues.push(permission[el] && permission[el]._id);
			}

			arr.push({[key]: newValues});
		}

		return test(this.roles, arr);
	}

	/**
	 * Adds the user to the specified event object or creates new
	 * @param obj
	 */
	addToEvent(obj?: Object = {}): {ids: Set, send: (name: string, data: Object) => ?Promise} {
		obj.ids = obj.ids || new Set();
		obj.send = obj.send || ((name, data) => {
			if (obj.ids.size) {
				const
					nms = name.split('.'),
					type = nms.slice(1).join('.');

				notifyServer.emit('admin:push', {
					ids: [...obj.ids],
					name: type,
					data: {
						type,
						instance: nms[0],
						...data
					}
				});
			}
		});

		obj.ids.add(String(this._id));
		return obj;
	}

	/**
	 * Sends event notification for the user
	 *
	 * @param name - event name
	 * @param data
	 */
	sendEvent(name: string, data: Object): ?Promise {
		return this.addToEvent().send(name, data);
	}

	/**
	 * Adds the user to the specified push object or creates new
	 * @param obj
	 */
	addToPush(obj?: Object = {}): {tokens: Set, send: (name: string, data: Object) => ?Promise} {
		obj.tokens = obj.tokens || new Set();
		obj.send = obj.send || ((name, data) => {
			if (obj.tokens.size) {
				/* eslint-disable camelcase */

				const key = Object.keys(data)[0];
				return request.post({
					json: true,
					uri: 'https://fcm.googleapis.com/fcm/send',
					timeout: (1).minute(),
					headers: {Authorization: `key=${config.google.gcm}`},
					body: {registration_ids: [...obj.tokens], data: {type: name, [key]: data[key]}}
				});

				/* eslint-enable camelcase */
			}
		});

		$C(this.tokens).forEach((el) => {
			if (el.deviceToken) {
				obj.tokens.add(el.deviceToken);
			}
		});

		return obj;
	}

	/**
	 * Sends push notification for the user
	 *
	 * @param name - event name
	 * @param data
	 */
	sendPush(name: string, data: Object): ?Promise {
		return this.addToPush().send(name, data);
	}

	/**
	 * Compares the specified password with the source and returns true if they are equal
	 * @param password
	 */
	async comparePassword(password: string): boolean {
		const hash = await pbkdf2(password, Buffer.concat([SALT, this.salt]), ...PBKDF2);
		return Boolean(hash && !hash.compare(this.password));
	}

	/**
	 * Adds an authorization token for the user
	 *
	 * @param [deviceToken]
	 * @param [clear] - if true, then the another user session will be cleared
	 */
	async addSessionToken(deviceToken?: string, clear?: boolean): string {
		const obj = {
			id: this._id,
			uid: (await randomBytes(SALT_LENGTH)).toString('hex')
		};

		const
			value = jwt.sign(obj, JWT_SECRET),
			token = {value, deviceToken};

		if (clear) {
			this.tokens = [token];

		} else {
			this.tokens.push(token);
		}

		await this.save();
		return value;
	}

	/**
	 * Sets a new device token for the user
	 *
	 * @param authToken
	 * @param deviceToken
	 */
	async setDeviceToken(authToken: string, deviceToken: string): boolean {
		await this.constructor.update(
			{
				'_id': this._id,
				'tokens.value': authToken
			},

			{
				$set: {
					'tokens.$.deviceToken': deviceToken
				}
			},

			{unsafe: true}
		);

		return true;
	}

	/**
	 * Sets a new xsrf token to the session
	 * @param authToken
	 */
	async setXsrf(authToken: string): string {
		authToken = authToken.replace(jwtRgxp, '');

		const
			obj = $C(this.tokens).one.get((el) => el.value === authToken);

		if (!obj) {
			throw boom.unauthorized(l`Invalid authorization token`);
		}

		const
			value = (await randomBytes(SALT_LENGTH)).toString('hex'),
			data = {value, createdDate: new Date()};

		await this.constructor.update(
			{
				_id: this._id,
				tokens: {
					$elemMatch: {xsrf: obj.xsrf || {$exists: false}}
				}
			},

			{
				$set: {
					'tokens.$.xsrf': data,
					'tokens.$.prevXsrf': obj.xsrf || data
				}
			},

			{unsafe: true}
		);

		obj.prevXsrf = obj.xsrf || data;
		obj.xsrf = data;

		return value;
	}

	/**
	 * Validates the specified xsrf token and sets new if needed
	 *
	 * @param authToken
	 * @param xsrfToken
	 */
	async validateXsrf(authToken: string, xsrfToken: string): string {
		authToken = authToken.replace(jwtRgxp, '');

		const
			obj = $C(this.tokens).one.get((el) => el.value === authToken),
			current = obj.xsrf,
			prev = obj.prevXsrf;

		if (
			!obj || !current || current.value !== xsrfToken && (
				prev.value !== xsrfToken || prev.createdDate.addMilliseconds(XSRF_EXPIRES + (1).minute()).isBefore('now')
			)
		) {
			throw boom.unauthorized(l`Invalid XSRF token`);
		}

		if (prev.value === xsrfToken) {
			return current.value;
		}

		if (current.createdDate.addMilliseconds(XSRF_EXPIRES).isBefore('now')) {
			return await this.setXsrf(authToken);
		}

		return xsrfToken;
	}

	/** @override */
	async toFullObject(): Object {
		const
			obj = await super.toFullObject();

		this.humanizeConstants(obj, 'lang', {
			role: {
				field: 'roles',
				reject: 'permissions'
			}
		});

		return obj;
	}
}
