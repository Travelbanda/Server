'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

const
	config = require('config'),
	NRP = require('node-redis-pubsub');

export const
	notifyServer = new NRP(config.redis);
