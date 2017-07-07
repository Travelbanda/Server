'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Enum from './enum';
import Store from 'core/store';
import joi from 'core/validation';
import { $$ as $$base } from './base';
import { model, type, index } from './core/model';
import * as _ from './core/types';

export const
	$$ = new Store();

@model(exports)
export default class Role extends Enum {
	/**
	 * Parent role
	 */
	@index()
	@type(_.objectId)
	parent: ?ObjectId;

	/**
	 * List of permissions
	 */
	@type(_.permission.array)
	permissions: Array<ObjectId>;

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
