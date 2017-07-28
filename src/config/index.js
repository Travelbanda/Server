'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import baseConfig from '@v4fire/core/src/config';

const
	$C = require('collection.js');

export default $C.extend(true, {}, baseConfig, CONFIG);
