'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	$C = require('collection.js');

const
	controllers = new WeakMap();

/**
 * Defines a controller
 *
 * @decorator
 * @param [opts] - additional options
 */
export function controller(opts?: Object = {}) {
	return (target) => {
		const {exports} = module.parent;
		exports.main = async function (controller) {
			await new target(controller, opts, {
				event: this,
				parent: controllers.get(Object.getPrototypeOf(target))
			});
		};

		exports.main.link = target;
		controllers.set(target, target);
	};
}

/**
 * Get request
 */
export const GET = factory('get');

/**
 * Post request
 */
export const POST = factory('post');

/**
 * Put request
 */
export const PUT = factory('put');

/**
 * Delete request
 */
export const DELETE = factory('delete');

/**
 * Patch request
 */
export const PATCH = factory('patch');

function factory(type) {
	return (strings, ...expr) =>
		$C(strings).reduce((str, el, i) => str + el + (i in expr ? expr[i] : ''), `${type}:`);
}
