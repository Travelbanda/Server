'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import auth from 'middlewares/auth';

export default class Chain {
	/**
	 * Chain object
	 */
	chain: {
		auth: boolean,
		xsrf: boolean,
		permissions: Array<Object | string> | Object<string> | string,
		handlers: Array<Function>
	};

	constructor() {
		this.chain = {
			auth: false,
			xsrf: false,
			permissions: {},
			handlers: []
		};
	}

	/**
	 * Enables/disables the authentication middleware
	 *
	 * @param model - model name or false if disabled
	 * @param [permissions] - permission groups
	 */
	auth(model: string | boolean, permissions?: Array<Object | string> | Object<string> | string): this {
		this.chain.auth = model;

		if (permissions) {
			this.permissions(permissions);
		}

		return this;
	}

	/**
	 * Sets permission groups for the authentication middleware
	 * @param permissions
	 */
	permissions(permissions: Array<Object | string> | Object<string> | string): this {
		this.chain.permissions = permissions;
		return this;
	}

	/**
	 * Clears the list of handlers
	 */
	clear(): this {
		this.chain.handlers = [];
		return this;
	}

	/**
	 * Adds handlers to the chain
	 * @param handlers
	 */
	push(...handlers: Function): this {
		const
			arr = [];

		for (let i = 0; i < handlers.length; i++) {
			arr.push(async (ctx, next) => {
				try {
					return await handlers[i](ctx, next);

				} catch (err) {
					stderr(err);

					if (err.throwed) {
						throw err;
					}

					ctx.boom.wrap(err);
				}
			});
		}

		this.chain.handlers = this.chain.handlers.concat(arr);
		return this;
	}

	/**
	 * Adds guards for the specified query parameters
	 *
	 * @param ctx - context object
	 * @param fields - map of parameters (parameter: source) or an array of parameters or the parameter name
	 * @param [converter] - data converter
	 */
	addGuard(
		ctx: {query?: Object, project?: Object, user?: Object, reqData?: Object},
		fields: Object | Array | string,
		converter?: Function = String

	): Object {
		if (Object.isString(fields)) {
			fields = {[fields]: true};

		} else if (Object.isArray(fields)) {
			fields = Object.fromArray(fields);
		}

		const
			s = ctx.project || ctx.user || {},
			q = ctx.reqData || {};

		const
			c = (v) => converter ? converter(v) : v,
			keys = Object.keys(fields);

		for (let i = 0; i < keys.length; i++) {
			const
				field = keys[i];

			let
				from = fields[field];

			if (Object.isFunction(from)) {
				from = from(s);

			} else {
				from = s[from === true ? field : from];
			}

			const
				arr = [].concat(q);

			for (let i = 0; i < arr.length; i++) {
				const
					q = arr[i],
					el = q[field];

				if (field in q === false) {
					q[field] = from;

				} else if (Object.isArray(el) && Object.isArray(from)) {
					const
						set = new Set();

					for (let i = 0; i < from.length; i++) {
						set.add(c(from[i]));
					}

					const
						fields = [];

					for (let i = 0; i < el.length; i++) {
						if (set.has(c(el[i]))) {
							fields.push(el[i]);
						}
					}

					q[field] = fields;

				} else if (c(el) !== c(from)) {
					q[field] = from;
				}
			}
		}

		return q;
	}

	/**
	 * Returns an array of middlewares
	 */
	toArray(): Array<Function> {
		const
			o = this.chain;

		const arr = [(ctx, next) => {
			const
				{query, reqData, request: {body}} = ctx,
				dangerProps = /^\$/;

			if (Object.isArray(body)) {
				ctx.reqData = Object.assign(body.slice(), reqData);

			} else {
				ctx.reqData = Object.reject({
					...query,
					...body,
					...reqData
				}, dangerProps);
			}

			/**
			 * Forks a context object
			 * @param args
			 */
			ctx.forkCtx = (...args: any): Object => ({
				user: ctx.user,
				reqData: Object.assign(
					Object.isArray(ctx.reqData) ? ctx.reqData : Object.reject(ctx.reqData, dangerProps),
					...args
				)
			});

			return next();
		}];

		if (o.auth) {
			arr.push(auth(o.auth, o.permissions));
		}

		return arr.concat(o.handlers);
	}
}
