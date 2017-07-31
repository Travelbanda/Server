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
import { model, type, unique } from 'models/core/model';
import * as _ from 'models/core/types';

export const
	$$ = new Store();

@model(module, {abstract: true})
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
