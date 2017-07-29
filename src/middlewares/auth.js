'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	mongoose = require('mongoose');

/**
 * Authorise middleware
 *
 * @param model - model name
 * @param permissions - permission groups
 */
export default function auth(model: string, permissions: Array<Object | string> | Object<string> | string): Function {
	return async (ctx, next) => {
		const
			h = ctx.headers;

		try {
			const
				session = await mongoose.model(model).authorize(h['authorization'], h['x-xsrf-token'], permissions);

			ctx.user = session.user;
			ctx.permissionGroup = session.permissionGroup;
			session.xsrf && ctx.set('x-xsrf-token', session.xsrf);

		} catch (err) {
			if (err.data && err.data.xsrf) {
				ctx.set('x-xsrf-token', err.data.xsrf);
			}

			ctx.boom.wrap(err);
		}

		return next();
	};
}
