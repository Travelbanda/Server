'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

const {env} = process;
global.isProd = env.NODE_ENV === 'production';

const
	$C = require('collection.js'),
	config = require('config'),
	path = require('path'),
	path2rgxp = require('path-to-regexp');

const
	Koa = require('koa'),
	Raven = require('raven'),
	Router = require('koa-router'),
	send = require('koa-send');

module.exports = async (port, dist) => {
	const
		app = new Koa(),
		router = new Router();

	if (isProd) {
		Raven
			.config(config.sentry.url)
			.install();
	}

	app.on('error', (err) => {
		console.error(err);
		isProd && Raven.captureException(err, (err, eventId) => console.log(`Reported error ${eventId}`));
	});

	require('./core');
	await require('./models')();
	await require('./init')();
	await require('./bot')();

	if (Number(env.WORKER_MODE)) {
		await require('./workers')();
	}

	await require('./controllers')(router);

	if (isProd) {
		app.use(require('koa-logger')());
	}

	app
		.use(require('koa-bodyparser')())
		.use(require('kcors')({
			credentials: true,
			allowHeaders: ['X-XSRF-TOKEN', 'Authorization', 'Content-Type'],
			exposeHeaders: ['X-XSRF-TOKEN', 'X-JWT-TOKEN']
		}));

	$C(['query', 'boom', 'wifi', 'assets', 'manifest', 'config'])
		.forEach((el) => app.use(require(`./middlewares/${el}`)));

	app
		.use(router.routes())
		.use(router.allowedMethods());

	// Self static serving
	if (!isProd) {
		app
			.use(serve('/dist/packages/**'))
			.use(serve('/assets/**'));
	}

	app
		.use(serve('/chat/wifi', path.join(dist, 'p-guest-wifi.html')))
		.use(serve(isProd ? '/admin/' : '/', path.join(dist, 'p-auth.html')))
		.use(serve(isProd ? '/chat/:id/' : '/:id/chat/', path.join(dist, 'p-guest-chat.html')))
		.use(serve(isProd ? '/admin/**' : '/**', path.join(dist, 'p-admin.html')));

	await require('./sockets')(app.listen(port));
	console.log(`Server started at localhost:${port}`);
};

const
	acceptedRequests = new Set(['HEAD', 'GET', 'POST']),
	fixPath = /^\/[a-zA-Z]+\/?/,
	isHTML = /\.html$/;

function serve(root, to) {
	return async (ctx, next) => {
		const
			path = !to && isProd ? ctx.path.replace(fixPath, '/') : ctx.path;

		if (acceptedRequests.has(ctx.method) && path2rgxp(root).test(path)) {
			if (isHTML.test(to)) {
				ctx.set('Cache-Control', `no-store, no-cache, must-revalidate`);
				ctx.set('Pragma', `no-cache`);
			}

			if (await send(ctx, to || path, {gzip: isProd})) {
				return;
			}
		}

		return next();
	};
}
