'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import init from 'core/init';

/**
 * Initializes socket listeners
 * @param server - http server
 */
module.exports = (server) => init(module.parent)(require('socket.io')(server));
