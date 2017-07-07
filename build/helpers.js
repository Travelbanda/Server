'use strict';

/*!
 * TravelChat Client
 * https://github.com/Travelbanda/TravelChat
 *
 * Released under the FSFUL license
 * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE
 */

exports.getVersion = function () {
	return require('../package.json').version;
};

exports.getHead = function (version) {
	/* eslint-disable prefer-template */
	return (
		'/*!\n' +
		' * TravelChat Client' + (version ? ' v' + getVersion() : '') + '\n' +
		' * https://github.com/Travelbanda/TravelChat\n' +
		' *\n' +
		' * Released under the FSFUL license\n' +
		' * https://github.com/Travelbanda/TravelChat/blob/master/LICENSE\n'
	);
	/* eslint-enable prefer-template */
};
