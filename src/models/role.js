'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Enum from 'models/enum';
import Store from 'core/store';
import joi from 'core/validation';
import { $$ as $$base } from 'models/base';
import { model, type, index } from 'models/core/model';
import * as _ from 'models/core/types';

export const
	$$ = new Store();

@model({abstract: true})
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
