'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Base, { $$ as $$base } from './base';
import Store from 'core/store';
import joi from 'core/validation';
import { model, type, index } from './core/model';
import * as _ from './core/types';

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
