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
		$C = require('collection.js'),
		config = require('config'),
		path = require('path'),
		cached = require('gulp-cached');

	const
		paths = $C(config.serverSrc).map((el) => path.join(path.relative(__dirname, el), '/**/*'));

	gulp.task('cleanServer', (cb) => {
		const del = require('del');
		del('./dist/server').then(() => cb(), cb);
	});

	gulp.task('server', (cb) => {
		const
			async = require('async'),
			plumber = require('gulp-plumber'),
			babel = require('gulp-babel'),
			through = require('through2'),
			isPathInside = require('is-path-inside');

		const buildTask = (src, opts) => {
			return [
				(cb) => gulp.src(`${src}.js`, opts)
					.pipe(plumber())
					.pipe(cached('server'))
					.pipe(through.obj((file, enc, cb) => {
						if (
							$C(config.serverSrc).some((el) => isPathInside(file.path, path.join(el, 'models'))) &&
							path.basename(path.dirname(file.path)) === 'models' &&
							path.basename(file.path) !== 'index.js'

						) {
							file.contents = new Buffer(require('@v4fire/core/build/prop')(String(file.contents), 'model'));
						}

						cb(null, file);
					}))

					.pipe(babel(config.babel.server))
					.pipe(gulp.dest('./dist/server'))
					.on('end', cb),

				(cb) => gulp.src([src, `!${src}.js`], opts)
					.pipe(gulp.dest('./dist/server'))
					.on('end', cb)
			];
		};

		const tasks = $C(paths.slice(1)).reduce(
			(tasks, el, i) => tasks.concat(buildTask(el, {base: 'node_modules'})),
			buildTask(paths[0])
		);

		async.parallel(tasks, cb);
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
		gulp.watch(paths, ['runServer']).on('change', (e) => {
			if (e.type === 'deleted') {
				delete cached.caches['build'][e.path];
			}
		});
	});
};

module.exports();
