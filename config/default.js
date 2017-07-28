'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	path = require('path'),
	defConfig = require('@v4fire/core/config/default');

const
	{env} = process;

const config = module.exports = $C.extend(true, {}, defConfig, {
	db: {
		autoIndex: true,
		uri: env.MONGOHQ_URL
	},

	redis: {
		scope: /production/.test(env.SERVICE_NAME) ? 'production' : 'staging',
		url: env.REDIS_URL
	}
});

config.src = [].concat(
	defConfig.src,
	path.join(__dirname, '../src')
);

config.babel = $C.extend(
	{
		deep: true,
		concatArray: true
	},

	{},

	defConfig.babel,

	{
		resolveModuleSource(source, from) {
			if (path.isAbsolute(source) || /^(\.|babel-runtime)/.test(source)) {
				return source;
			}

			const p = path.posix;
			return p.relative(p.dirname(from.replace(/.*?src\//, '')), p.join('./server', source));
		},

		plugins: [
			'transform-strict-mode'
		]
	}
);
