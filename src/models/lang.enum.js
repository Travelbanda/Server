'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Enum from 'models/enum';
import { model } from 'models/core/model';

@model(exports, {abstract: true})
export default class LangEnum extends Enum {}
