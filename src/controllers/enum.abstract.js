'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Base from 'controllers/base';
import { GET, controller } from 'controllers/core/controller';

@controller(exports, {abstract: true})
export default class Enum extends Base {
	/**
	 * Returns enums
	 */
	[GET``](o: Chain, model) {
		o.push(async (ctx) => ctx.body = await model.getList(ctx.reqData));
	}
}
