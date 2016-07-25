'use strict';

/**
 * @module graph-datastore.Graph
 */
const Emitter = require('eventemitter3');
const Node = require('../Node');
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

	/**
	 * Turn an object with nodes in it into a graph.
	 *
	 * @param  {Object} object - An object with nothing
	 * but nodes inside.
	 * @returns {Graph} - A new graph containing all the nodes.
	 */
	static 'from' (object) {

		const graph = Graph.create();

		for (const key in object) {
			if (object.hasOwnProperty(key)) {
				const node = object[key];
				graph.add(node);
			}
		}

		return graph;
	}

	constructor () {
		super();

		this[nodes] = {};
	}

	/**
	 * Return the unmodified value of a node lookup.
	 *
	 * @param  {String} key - The name/uid of the node.
	 * @returns {Node|null} - The node if found, otherwise `null`.
	 */
	raw (key) {
		return this[nodes][key] || null;
	}

	/**
	 * Add a node to the graph, merging if it already exists.
	 *
	 * @emits Graph#event:add
	 * @param  {Node} node - The data to add.
	 * @returns {Graph} - The context object.
	 */
	add (node) {

		if (!(node instanceof Node)) {
			node = Node.from(node);
		}

		const { uid } = node.meta();

		const existing = this[nodes][uid];
		if (existing) {
			existing.merge(node);
			return this;
		}

		this[nodes][uid] = node;

		this.emit('add', node);

		return this;
	}

	/**
	 * Merge one graph with another (graph union operation).
	 * Calls add under the hood.
	 *
	 * @param  {Object} graph - The graph to merge with.
	 * Items must be enumerable, and cannot be inherited from prototypes.
	 * @returns {Graph} - The `this` context.
	 */
	merge (graph) {

		/** Ensure it's a graph. */
		if (!(graph instanceof Graph)) {
			graph = Graph.from(graph);
		}

		const keys = graph.keys();

		keys.forEach((key) => {
			const node = graph.raw(key);
			this.add(node);
		});

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
