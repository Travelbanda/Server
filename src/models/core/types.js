'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

import Type from 'models/core/type';
import joi from 'core/validation';
import * as rules from 'core/const/validation';

const
	mongoose = require('mongoose');

export const
	schemaTypes = mongoose.Schema.Types;

/**
 * Converts the specified joi type to an array type
 * @param value
 */
export function toArray(value: joi & {toArray: Function}): [joi, joi] {
	return [value.toArray(), joi.array().items(value)];
}

joi.get('objectId', null, () => joi.objectId());
joi.get('objectIds', 'objectId', toArray);

/**
 * MongoId type
 */
export const objectId = new Type({
	type: schemaTypes.ObjectId,
	joi: 'objectId'
});

if (joi.lang) {
	joi.get('lang', null, () => joi.lang());
	joi.get('langs', 'lang', toArray);
}

/**
 * Language type
*/
export const lang = joi.lang && new Type({
	type: schemaTypes.ObjectId,
	joi: 'lang'
});

if (joi.permission) {
	joi.get('permission', null, () => joi.permission());
	joi.get('permissions', 'permission', toArray);
}

/**
 * Permission type
 */
export const permission = joi.permission && new Type({
	type: schemaTypes.ObjectId,
	joi: 'permission'
});

if (joi.role) {
	joi.get('role', null, () => joi.role());
	joi.get('roles', 'role', toArray);
}

/**
 * Role type
 */
export const role = joi.role && new Type({
	type: schemaTypes.ObjectId,
	joi: 'role'
});

/**
 * Mixed type
 */
export const object = new Type({
	type: schemaTypes.Mixed
});

/**
 * Binary type
 */
export const binary = new Type({
	type: Buffer
});

joi.get('date', null, () => joi.date());
joi.get('dates', 'date', toArray);

/**
 * Date type
 */
export const date = new Type({
	type: Date,
	joi: 'date'
});

joi.get('futureDate', null, () => joi.date().min('now'));
joi.get('futureDates', 'futureDate', toArray);

/**
 * Future date type
 */
export const futureDate = new Type({
	type: Date,
	joi: 'futureDate'
});

joi.get('float', null, () => joi.number());
joi.get('floats', 'float', toArray);

/**
 * Float type
 */
export const float = new Type({
	type: Number,
	joi: 'float'
});

joi.get('int', 'float', (s) => s.integer());
joi.get('ints', 'int', toArray);

/**
 * Integer type
 */
export const int = new Type({
	type: Number,
	joi: 'int'
});

joi.get('ufloat', 'float', (s) => s.min(0));
joi.get('ufloats', 'ufloat', toArray);

/**
 * UFloat type
 */
export const ufloat = new Type({
	type: Number,
	joi: 'ufloat'
});

joi.get('uint', 'int', (s) => s.min(0));
joi.get('uints', 'uint', toArray);

/**
 * UInt type
 */
export const uint = new Type({
	type: Number,
	joi: 'uint'
});

joi.get('boolean', null, () => joi.boolean());
joi.get('booleans', 'boolean', toArray);

/**
 * Boolean type
 */
export const boolean = new Type({
	type: Boolean,
	joi: 'boolean'
});

joi.get('string', null, () => joi.string());
joi.get('strings', 'string', toArray);
joi.get('optionalString', 'string', (s) => s.allow(''));
joi.get('optionalStrings', 'optionalString', toArray);

/**
 * String type
 */
export const string = new Type({
	type: String,
	joi: 'string'
});

joi.get('password', 'string', (s) => s
	.trim()
	.min(rules.password.min)
	.max(rules.password.max)
	.regex(rules.password.pattern));

joi.get('name', 'string', (s) => s.trim().min(rules.name.min).max(rules.name.max));
joi.get('names', 'name', toArray);

/**
 * Name type
 */
export const name = new Type({
	type: String,
	trim: true,
	joi: 'name'
});

joi.get('optionalName', 'string', (s) => s.trim().allow('').max(rules.name.max));
joi.get('optionalNames', 'optionalName', toArray);

/**
 * Empty name type
 */
export const optionalName = new Type({
	type: String,
	trim: true,
	joi: 'optionalName'
});

joi.get('specialName', 'name', (s) => s.regex(rules.name.pattern));
joi.get('specialNames', 'specialName', toArray);

joi.get('fullName', 'string', (s) => s.trim().min(rules.name.min).max(rules.name.max * 2));
joi.get('fullNames', 'fullName', toArray);

/**
 * Full name type
 */
export const fullName = new Type({
	type: String,
	trim: true,
	joi: 'fullName'
});

joi.get('optionalFullName', 'string', (s) => s.trim().allow('').max(rules.name.max * 2));
joi.get('optionalFullNames', 'optionalFullName', toArray);

/**
 * Empty full name type
 */
export const optionalFullName = new Type({
	type: String,
	trim: true,
	joi: 'optionalFullName'
});

/**
 * Special user name type
 */
export const specialName = new Type({
	type: String,
	trim: true,
	joi: 'specialName'
});

joi.get('nameId', 'specialName', (s) => s.lowercase());
joi.get('nameIds', 'nameId', toArray);

/**
 * Name id type
 */
export const nameId = new Type({
	type: String,
	trim: true,
	lowercase: true,
	joi: 'nameId'
});

joi.get('optionalKey', 'string', (s) => s.trim().allow('').max(rules.key.max));
joi.get('optionalKeys', 'optionalKey', toArray);

/**
 * Empty key type
 */
export const optionalKey = new Type({
	type: String,
	trim: true,
	joi: 'optionalKey'
});

joi.get('key', 'string', (s) => s.trim().min(rules.key.min).max(rules.key.max));
joi.get('keys', 'key', toArray);

/**
 * Key type
 */
export const key = new Type({
	type: String,
	trim: true,
	joi: 'key'
});

joi.get('description', 'string', (s) => s.trim().allow('').max(rules.description.max));
joi.get('descriptions', 'description', toArray);

/**
 * String description type
 */
export const description = new Type({
	type: String,
	trim: true,
	joi: 'description'
});

joi.get('comment', 'string', (s) => s.trim().allow('').max(rules.comment.max));

/**
 * String comment type
 */
export const comment = new Type({
	type: String,
	trim: true,
	joi: 'comment'
});

joi.get('descriptionObject', 'description', (s) =>
	joi.object().pattern(new RegExp(`[^\\s]{${rules.key.min},${rules.key.max}`), s));

/**
 * Description object type
 */
export const descriptionObject = new Type({
	type: schemaTypes.Mixed,
	trim: true,
	joi: 'descriptionObject'
});

joi.get('nameObject', 'name', (s) =>
	joi.object().pattern(new RegExp(`[^\\s]{${rules.key.min},${rules.key.max}`), s));

/**
 * Name object type
 */
export const nameObject = new Type({
	type: schemaTypes.Mixed,
	trim: true,
	joi: 'nameObject'
});

joi.get('email', 'string', (s) => s.trim().email());
joi.get('emails', 'email', toArray);

/**
 * Email type
 */
export const email = new Type({
	type: String,
	trim: true,
	lowercase: true,
	joi: 'email'
});

joi.get('url', 'string', (s) => s.trim().uri());
joi.get('urls', 'url', toArray);

/**
 * URL type
 */
export const url = new Type({
	type: String,
	trim: true,
	joi: 'url'
});

joi.get('phone', 'string', (s) => s
	.trim()
	.regex(/^\+?[\d\-() ]+$/)
	.replace(/^([^+])/, '+$1')
	.replace(/[-() ]/g, '')
);

joi.get('phones', 'phone', toArray);

/**
 * Phone type
 */
export const phone = new Type({
	type: String,
	trim: true,
	joi: 'phone'
});
