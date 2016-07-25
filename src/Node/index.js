'use strict';

/**
 * @module graph-datastore.Node
 */

const Symbol = require('es6-symbol');
const diff = require('merge-helper');
const Emitter = require('eventemitter3');
const time = require('../time');

const node = Symbol('source object');
const defer = Symbol('defer method');

let alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
alphanumeric += alphanumeric.toLowerCase();
alphanumeric += '0123456789';

/**
 * An observable object with conflict-resolution.
 *
 * @class Node
 */
class Node extends Emitter {

	/**
	 * Creates a new Node instance without using
	 * `new`.
	 *
	 * @returns {Node} - The new node instance.
	 */
	static create () {
		return new Node();
	}

	/**
	 * Turns a normal object into a Node instance.
	 * Properties to be imported must be enumerable
	 * and cannot be inherited via prototype.
	 *
	 * @param  {Object} object - Any enumerable object.
	 * @returns {Node} - A node interface constructed from the object.
	 */
	static 'from' (object) {
		const node = Node.create();
		const now = time();

		for (const key in object) {
			if (object.hasOwnProperty(key)) {
				node.update(key, object[key], now);
			}
		}

		return node;
	}

	/**
	 * Generate a random string of characters.
	 *
	 * @param {Object} [options] - An options object.
	 * @param  {String|Array} [options.charset] - The symbols to choose from.
	 * The default character set is mixed-case alphanumeric.
	 * @param  {Number} [options.length] - The number of characters to generate.
	 * Defaults to 24.
	 * @returns {String} - The finished string.
	 */
	static uid ({ charset = alphanumeric, length = 24 } = {}) {

		// Immediately invoked, recursively calls itself.
		return (function recurse (length, string) {

			// Base case.
			if (length <= 0) {
				return string;
			}

			/** Finds a random character. */
			const random = Math.random() * charset.length;

			/** Rounds it down. */
			const index = Math.floor(random);

			/** Chooses that character. */
			const char = charset[index];

			/** Do it again. */
			return recurse(length - 1, string + char);

		}(length, ''));

	}

	constructor () {

		super();

		/** Lookup table for reserved symbols. */
		this.legend = {
			metadata: '@object',
		};

		this[node] = {
			[this.legend.metadata]: {
				uid: Node.uid(),
			},
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
	 * or undefined if it doesn't exist. Cannot be called
	 * on reserved fields (like "@object").
	 */
	read (field) {
		if (field === this.legend.metadata) {
			return undefined;
		}

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

	/**
	 * Schedule updates that have been deferred.
	 *
	 * @private
	 * @param  {Object} updates - A description of all deferred
	 * keys and their metadata.
	 * @param  {Number|Date} state - The state the machine is running at.
	 * Preferably a Date or epoch timestamp.
	 * @returns {undefined}
	 */
	[defer] (updates, state) {
		const keys = Object.keys(updates);

		// If there aren't any deferred updates, quit.
		if (!keys.length) {
			return;
		}

		keys.forEach((key) => {
			const { value, state: scheduled } = updates[key];

			setTimeout(() => {
				const incoming = Node.create();
				incoming.update(key, value, state);

				this.merge(incoming);
			}, scheduled - state);
		});

		this.emit('deferred', updates);
	}

	/**
	 * merge - description
	 *
	 * @param  {Node|Object} update - The node to merge from.
	 * If a plain object is passed, it will be upgraded to a node
	 * using `Node.from`.
	 * @param  {Number|Date} [state] - Override the system clock.
	 * Useful for reverting to an earlier snapshot.
	 * @returns {Node} - The `this` context.
	 */
	merge (update, state) {

		if (!(update instanceof Node)) {
			update = Node.from(update);
		}

		if (state === undefined) {
			state = time();
		}

		const result = diff(this[node], update[node], state);

		const { historical, updates, deferred } = result;

		const updateKeys = Object.keys(updates);

		if (Object.keys(historical).length) {
			this.emit('historical', historical);
		}

		if (updateKeys.length) {

			/** Updates each field. */
			updateKeys.forEach((key) => {
				const { value, state } = updates[key];
				this.update(key, value, state);
			});

			/** After finishing, the `update` event is fired. */
			this.emit('update', updates);
		}

		/** Handles deferred updates. */
		this[defer](deferred, state);

		return this;

	}

	/* Coercion interfaces */

	/**
	 * Returns the node's uid. Not meant for end developers,
	 * instead used by JavaScript for type coercion.
	 *
	 * @private
	 * @returns {String} - The node's unique ID.
	 */
	toString () {
		const { uid } = this.meta();

		return uid;
	}
}

module.exports = Node.default = Node;
