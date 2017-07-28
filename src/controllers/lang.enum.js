'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Enum from 'controllers/enum';
import { controller } from 'controllers/core/controller';

@controller(exports, {abstract: true})
export default class LangEnum extends Enum {}
