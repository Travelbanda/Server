'use strict';

/*!
 * V4Fire Server Core
 * https://github.com/V4Fire/Server
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Server/blob/master/LICENSE
 */

module.exports = function (gulp = require('gulp')) {
	require('@v4fire/core/gulpfile')(gulp);

	const
		plumber = require('gulp-plumber'),
		cached = require('gulp-cached');

	gulp.task('cleanServer', (cb) => {
		const del = require('del');
		del('./dist/server').then(() => cb(), cb);
	});

	gulp.task('server', (cb) => {
		const
			$C = require('collection.js'),
			async = require('async'),
			config = require('config'),
			path = require('path');

		const
			babel = require('gulp-babel'),
			through = require('through2'),
			isPathInside = require('is-path-inside');

		async.parallel([
			(cb) => gulp.src('./src/@(server|core|lang)/**/*.js')

				.pipe(plumber())
				.pipe(cached('server'))
				.pipe(through.obj((file, enc, cb) => {
					if (
						isPathInside(file.path, './src/server/models') &&
						path.basename(path.dirname(file.path)) === 'models' &&
						path.basename(file.path) !== 'index.js'

					) {
						file.contents = new Buffer(require('@v4fire/core/build/prop')(String(file.contents), 'model'));
					}

					cb(null, file);
				}))

				.pipe(babel($C.extend({deep: true, concatArray: true}, {}, config.babel.base, config.babel.server)))
				.pipe(gulp.dest('./dist'))
				.on('end', cb),

			(cb) => gulp.src(['./src/server/**/*', '!./src/server/**/*.js'])
				.pipe(gulp.dest('./dist/server'))
				.on('end', cb)

		], cb);
	});

	let server;
	gulp.task('runServer', ['server'], (cb) => {
		const
			{spawn} = require('child_process');

		if (server) {
			server.kill('SIGTERM');
		}

		server = spawn('node', ['--harmony', 'index.js'], {
			env: process.env,
			silent: false
		});

		server.once('exit', () => console.log(':~~> Kill old server process'));
		server.stdout.on('data', x => process.stdout.write(x));
		server.stderr.on('data', x => process.stderr.write(x));
		cb();
	});

	gulp.task('watchServer', ['runServer'], () => {
		gulp.watch('./src/server/**/*', ['runServer']).on('change', (e) => {
			if (e.type === 'deleted') {
				delete cached.caches['build'][e.path];
			}
		});
	});

	gulp.task('watch', ['watchServer']);
	gulp.task('default', ['head', 'cleanServer', 'server']);
};

module.exports();
