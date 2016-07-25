'use strict';

/**
 * @module graph-datastore.Graph
 */
const Emitter = require('eventemitter3');
const Symbol = require('es6-symbol');

const nodes = Symbol('graph node container');

/**
 * Container and interface for groups of nodes.
 *
 * @class
 */
class Graph extends Emitter {

	/**
	 * Instantiates a graph without needing `new`.
	 *
	 * @returns {Graph} - A graph instance.
	 */
	static create () {
		return new Graph();
	}

	constructor () {
		super();

		this[nodes] = {};
	}

	/**
	 * Add a node to the graph.
	 *
	 * @emits Graph#event:add
	 * @param  {Node} node - The data to add.
	 * @returns {Graph} - The context object.
	 */
	add (node) {
		const { uid } = node.meta();

		/** Make sure the node isn't already inside. */
		if (this[nodes][uid]) {
			return this;
		}

		this[nodes][uid] = node;

		this.emit('add', node);

		return this;
	}

	/**
	 * Get a list of keys in the graph.
	 *
	 * @returns {String[]} - A list of keys.
	 */
	keys () {
		return Object.keys(this[nodes]);
	}

}

module.exports = Graph.default = Graph;
