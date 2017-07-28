'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import { role } from 'init/enums';

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
				res = await mongoose.model(model).authorize(h['authorization'], h['x-xsrf-token'], permissions);

			ctx.user = res.user;
			ctx.permissionGroup = res.permissionGroup;

			let
				hotel = h['x-hotel'];

			if (hotel && ctx.user.hasPermissions('AdminAccess')) {
				hotel = (await mongoose.model('Hotel').findOne({nameId: hotel.toLowerCase()}))._id;
				ctx.user = Object.create(ctx.user);

				Object.assign(ctx.user, {
					hotel,
					roles: [...ctx.user.roles, role.hotelManager]
				});

				ctx.reqData = {
					...ctx.reqData,
					hotel
				};
			}

			res.xsrf && ctx.set('x-xsrf-token', res.xsrf);

		} catch (err) {
			if (err.data && err.data.xsrf) {
				ctx.set('x-xsrf-token', err.data.xsrf);
			}

			ctx.boom.wrap(err);
		}

		return next();
	};
}
