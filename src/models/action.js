'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Base, { $$ as $$base } from 'models/base';
import Store from 'core/store';
import joi from 'core/validation';
import { model, type, index } from 'models/core/model';
import * as _ from 'models/core/types';

export const
	$$ = new Store();

@model(exports, {abstract: true})
export default class Action extends Base {
	/**
	 * Action type
	 */
	@index()
	@type(_.description)
	type: String;

	/**
	 * Action info
	 */
	@type(_.object)
	action: Object;

	/** @override */
	__onSchemaCreated(schema: Schema, params: Object) {
		super.__onSchemaCreated(
			...arguments,
			$$
		);

		joi.get($$.query, $$base.query, (s, p) => ({
			$schema: params.fields,
			...p
		}));

		joi.get($$.queryUpdate, $$.query);
	}
}
