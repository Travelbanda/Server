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
	EventEmitter = require('eventemitter2').EventEmitter2;

const
	fs = require('fs'),
	path = require('path');

const
	initialized = Symbol('initialized');

/**
 * Creates a module initializer
 * @param module - module object
 */
export default function factory(module: Object): Function {
	if (module[initialized]) {
		return Promise.resolve();
	}

	const
		dir = path.dirname(module.filename);

	return async (...args) => {
		const
			e = new EventEmitter({wildcard: true, maxListeners: 100}),
			success = new Map(),
			fail = new Map();

		/**
		 * Returns true if a module by the specified link is not initialized
		 * @param link
		 */
		e.isNotInitialized = function (link: any): boolean {
			if (link == null) {
				return false;
			}

			return !(success.has(name) || fail.has(name));
		};

		/**
		 * Waits a module by the specified link
		 * @param link
		 */
		e.wait = function (link: any): Promise {
			return new Promise((resolve, reject) => {
				const fn = () => {
					if (success.has(link)) {
						resolve(success.get(link));
						return true;
					}

					if (fail.has(link)) {
						reject(fail.get(link));
						return true;
					}
				};

				if (!fn()) {
					if (Object.isString(link)) {
						e.once(`${link}.success`, resolve);
						e.once(`${link}.error`, reject);

					} else {
						setImmediate(fn);
					}
				}
			});
		};

		await $C(fs.readdirSync(dir)).async.forEach((file, i, data, o) => {
			const
				src = path.join(dir, file),
				name = path.basename(file, '.js').camelize(false);

			if (file === 'index.js' || !fs.statSync(src).isFile()) {
				return;
			}

			let
				main,
				link;

			function onError(err) {
				fail.set(name, err);

				if (link) {
					fail.set(link, fail.get(name));

					if (Object.isString(link) || link.eventName) {
						e.emit(`${link.eventName || link}.error`, err);
						e.removeAllListeners(`${link.eventName || link}.success`);
					}
				}

				e.emit(`${name}.error`, err);
				e.removeAllListeners(`${name}.success`);

				throw err;
			}

			try {
				main = require(src).main;

				if (!main) {
					return;
				}

				link = main.link;
				o.wait(async () => {
					try {
						success.set(name, await main.call(e, ...args));

						const
							v = success.get(name);

						if (link) {
							success.set(link, v);

							if (Object.isString(link) || link.eventName) {
								e.emit(`${link.eventName || link}.success`, v);
								e.removeAllListeners(`${link.eventName || link}.error`);
							}
						}

						e.emit(`${name}.success`, v);
						e.removeAllListeners(`${name}.error`);

					} catch (err) {
						onError(err);
					}
				});

			} catch (err) {
				onError(err);
			}
		});

		module[initialized] = true;
	};
}
