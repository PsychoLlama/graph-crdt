'use strict';

const Symbol = require('es6-symbol');
const node = Symbol('node');

class Node {

	/**
	 * Creates a new Node instance without using
	 * `new`.
	 *
	 * @constructs Node
	 * @returns {Node} - The new node instance.
	 */
	static create () {
		return new Node();
	}

	constructor () {
		this.legend = {
			metadata: '@object',
		};

		this[node] = {
			[this.legend.metadata]: {},
		};
	}

	/**
	 * Read metadata, either on a field, or
	 * on the entire object.
	 *
	 * @param  {String} [field] - The property to read metadata from.
	 * @returns {Object|null} - If metadata is found, it returns the object.
	 * Otherwise `null` is given.
	 */
	meta (field) {

		if (field === undefined) {

			/** Returns the object metadata if no field is specified. */
			return this[node]['@object'];
		}

		/** Returns the field given, and null if metadata isn't found. */
		return this[node][field] || null;
	}

	/**
	 * Show the value of a node's property.
	 *
	 * @param  {String} field - The name of the property
	 * to retrieve.
	 * @returns {Mixed} - The value of the property,
	 * or undefined if it doesn't exist.
	 */
	prop (field) {

		/** Gets the field metadata. */
		const subject = this.meta(field);

		/**
		 * If the field exists, it returns the corresponding
		 * value, otherwise it returns undefined.
		 */
		return subject ? subject.value : undefined;
	}

	/**
	 * Forcibly update a value on the node. Soon to
	 * be deprecated in favor of ".merge()".
	 *
	 * @param  {String} field - The name of the property to update.
	 * @param  {Mixed} value - Any arbitrary value.
	 * @param  {Mixed} state - Anything that can be compared with
	 * `<`, `>`, or `===`. Preferably date objects or an epoch timestamp.
	 * Whatever is chosen, it MUST be consistent.
	 * @returns {undefined}
	 */
	update (field, value, state) {
		this[node][field] = { value, state };
		return this;
	}

	/**
	 * Get the state of the last update on a property.
	 *
	 * @param  {String} field - The name of the property.
	 * @returns {Mixed} - Whatever state comparison method
	 * was chosen. If the property doesn't exist, -Infinity
	 * is returned.
	 */
	state (field) {

		/** Get the field metadata. */
		const subject = this.meta(field);

		/** Return the state if it exists, or -Infinity when it doesn't. */
		return subject ? subject.state : -Infinity;
	}

	/**
	 * Return an array of all the keys belonging to the node.
	 *
	 * @returns {String[]} - A list of properties.
	 */
	keys () {

		const result = [];

		/** Gets the raw node object. */
		const object = this[node];

		/** Gets a reference to the metadata symbol. */
		const { metadata: meta } = this.legend;

		/** Iteratively add each key to the results. */
		for (const key in object) {

			/** Filters out inherited properties and the metadata key. */
			if (key !== meta && object.hasOwnProperty(key)) {
				result.push(key);
			}
		}

		return result;
	}

}

module.exports = exports.default = Node;
