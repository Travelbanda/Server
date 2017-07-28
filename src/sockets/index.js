'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

import init from 'core/init';
module.exports = (server) => init(module)(require('socket.io')(server));
