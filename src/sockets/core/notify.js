'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	config = require('config'),
	NRP = require('node-redis-pubsub');

export const
	notifyServer = new NRP(config.redis);
