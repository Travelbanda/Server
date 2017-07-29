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
	fs = require('fs'),
	path = require('path'),
	defConfig = require('@v4fire/core/config/default');

const
	{env} = process;

const config = module.exports = $C.extend(defConfig.extend, Object.create(defConfig), {
	src: {
		server: [path.join(__dirname, '../src'), defConfig.src.core],
		serverOutput() {
			return path.join(this.output(), 'server');
		}
	},

	db: {
		autoIndex: true,
		uri: env.MONGOHQ_URL
	},

	redis: {
		scope: /production/.test(env.SERVICE_NAME) ? 'production' : 'staging',
		url: env.REDIS_URL
	}
});

const
	exists = {};

config.babel = {
	server: $C.extend(
		{
			deep: true,
			concatArray: true
		},

		{},

		defConfig.babel,

		{
			resolveModuleSource(source, from) {
				const
					src = this.resolveModuleSource.src || config.src;

				if (!path.isAbsolute(source) && /^[^./\\]/.test(source)) {
					const paths = [].concat(
						src.server[0],
						src.cwd,
						src.server.slice(1)
					);

					const
						ends = [];

					if (path.extname(source)) {
						ends.push('');

					} else {
						ends.push('.js', '/index.js');
					}

					for (let i = 0; i < paths.length; i++) {
						for (let j = 0; j < ends.length; j++) {
							const
								file = path.join(paths[i], source + ends[j]);

							if (file in exists === false) {
								exists[file] = fs.existsSync(file);
							}

							if (exists[file]) {
								return `./${path.relative(path.dirname(from), file).replace(/\\/g, '/')}`;
							}
						}
					}
				}

				return source;
			},

			plugins: [
				'transform-strict-mode',
				['transform-es2015-modules-commonjs', {
					allowTopLevelThis: true,
					loose: true
				}]
			]
		}
	)
};
