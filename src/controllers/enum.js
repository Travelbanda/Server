'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

import Base from './base';
import { GET, controller } from './core/controller';

@controller(exports, {abstract: true})
export default class Enum extends Base {
	/**
	 * Returns enums
	 */
	[GET``](o: Chain, model) {
		o.push(async (ctx) => ctx.body = await model.getList(ctx.reqData));
	}
}
