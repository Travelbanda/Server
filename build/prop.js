'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

module.exports = function (str, module, needType) {
	let decorate = false;
	return str
		.replace(new RegExp(`import { (.*) } from '(.*?\\/${module})';`), (str, modules, from) => {
			decorate = true;
			return `import { ${modules}, prop } from '${from}';`;
		})

		/* eslint-disable max-params */

		.replace(/^(\t)([\w$]+)\s*:\s*([ \w|$?()[\]{}<>'"`:.]+?)(\s*)(=|;$)/gm, (str, sp, prop, type, esp, end) => {
			if (!decorate) {
				return str;
			}

			const map = {
				string: 'String',
				number: 'Number',
				boolean: 'Boolean'
			};

			let
				opt = end === '=',
				any = false;

			type = type.replace(/<.*?>(?=\s*(\||\)?\s*$))/g, '').split('|').reduce((arr, el) => {
				el = el.trim().replace(/^\?\s*/, () => {
					opt = true;
					return '';
				});

				if (/^\(/.test(el)) {
					el = el.replace(/^\(|\)$/g, '');
				}

				if (!any) {
					any = el === 'any';

					if (!any) {
						arr.push(map[el] || el);
					}
				}

				return arr;
			}, []);

			type = type.length > 1 ? `[${type.join()}]` : type[0];
			return `${sp}@prop(${needType ? `${type}, ${!opt}` : !opt})\n${sp + prop + esp}${end === ';' ? ' = undefined;' : end}`;
		});

	/* eslint-enable max-params */
};
