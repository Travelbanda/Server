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

@model(exports)
export default class Counter extends Base {
	/**
	 * Key
	 */
	@index()
	@type(_.comment)
	key: string;

	/**
	 * Index
	 */
	@type(_.uint)
	i: number = 0;

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
