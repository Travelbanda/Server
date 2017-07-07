'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	EventEmitter = require('eventemitter2').EventEmitter2;

const
	fs = require('fs'),
	path = require('path');

const
	initialized = Symbol();

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
			success = {},
			fail = {};

		/**
		 * Returns true if a module by the specified name is not initialized
		 * @param name
		 */
		e.isNotInitialized = function (name: ?string): boolean {
			if (name == null) {
				return false;
			}

			return !(name in success || name in fail);
		};

		/**
		 * Waits a module by the specified name
		 * @param name
		 */
		e.wait = function (name: string): Promise {
			return new Promise((resolve, reject) => {
				if (name in success) {
					resolve(success[name]);
					return;
				}

				if (name in fail) {
					reject(fail[name]);
					return;
				}

				e.once(`${name}.success`, resolve);
				e.once(`${name}.error`, reject);
			});
		};

		await $C(fs.readdirSync(dir)).async.forEach((file, i, data, o) => {
			const
				src = path.join(dir, file),
				name = path.basename(file, '.js').camelize(false);

			if (file === 'index.js' || !fs.statSync(src).isFile()) {
				return;
			}

			function onError(err) {
				fail[name] = err;

				if (main && main.eventName) {
					fail[main.eventName] = fail[name];
					e.emit(`${main.eventName}.error`, err);
					e.removeAllListeners(`${main.eventName}.success`);
				}

				e.emit(`${name}.error`, err);
				e.removeAllListeners(`${name}.success`);

				throw err;
			}

			let main;
			try {
				main = require(src).main;
				if (!main) {
					return;
				}

				o.wait(async () => {
					try {
						success[name] = await main.call(e, ...args);

						if (main.eventName) {
							success[main.eventName] = success[name];
							e.emit(`${main.eventName}.success`, success[name]);
							e.removeAllListeners(`${main.eventName}.error`);
						}

						e.emit(`${name}.success`, success[name]);
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
