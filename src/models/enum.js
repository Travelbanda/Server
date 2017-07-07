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
import { model, type, unique } from './core/model';
import * as _ from './core/types';

export const
	$$ = new Store();

@model(exports, {abstract: true})
export default class Enum extends Base {
	/**
	 * Field name
	 */
	@unique
	@type(_.name)
	name: string;

	/** @override */
	static allDocsRequest = true;

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
