/**
 * @module graph-crdt.Graph
 */

import Emitter from 'eventemitter3';
import Node from '../Node';

const nodes = Symbol('graph node container');

/**
 * Container and interface for groups of nodes.
 *
 * @class Graph
 */
export default class Graph extends Emitter {

  /**
   * Instantiates a graph without needing `new`.
   *
   * @returns {Graph} - A graph instance.
   */
  static create () {
    return new Graph();
  }

  /**
   * Imports a format compliant graph into a new one. It expects
   * nested nodes to use the node metadata format. Useful for
   * sending and importing graphs over the network.
   *
   * @param  {Object} object - The raw graph object.
   * @returns {Graph} - A new graph instance that consumes
   * the imported data.
   */
  static source (object) {

    // Create a new graph
    const graph = Graph.create();

    // For each node...
    Object.keys(object).forEach((key) => {

      const value = object[key];

      // Make sure it's a node.
      if (value instanceof Node) {
        graph.add(value);
      } else {

        // If it isn't, turn it into one.
        // Assume it's preformatted.
        const node = Node.source(value);
        graph.add(node);
      }
    });

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
  read (key) {
    return this[nodes][key] || null;
  }

  /**
   * Add a node to the graph, merging if it already exists. If
   * passed a plain object, it will convert it into a node using
   * `Node.from`.
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
      return existing.merge(node);
    }

    this[nodes][uid] = node;

    this.emit('add', node);

    return {
      update: node,
      history: new Node({ uid }),
      deferred: new Node({ uid }),
    };
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
      graph = Graph.source(graph);
    }

    const changes = {
      update: new Graph(),
      history: new Graph(),
      deferred: new Graph(),
    };

    for (const [uid, node] of graph) {
      let target = this.read(uid);

      if (!target) {
        target = this[nodes][uid] = node.new();
        this.emit('add', target);
      }

      const { update, history, deferred } = target.merge(node);

      changes.update[nodes][uid] = update;
      changes.history[nodes][uid] = history;
      changes.deferred[nodes][uid] = deferred;
    }

    this.emit('update', changes.update);
    this.emit('history', changes.history);
    this.emit('deferred', changes.deferred);

    return changes;
  }

  /**
   * Iterates over every node in the graph.
   * @return {Array} - Every yielded value is a key/value pair.
   */
  * [Symbol.iterator] () {
    const object = this[nodes];

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const value = this.read(key);
        yield [key, value];
      }
    }
  }

  /* Coercion interfaces */

  /**
   * Used to serialize a graph (JSON.stringify calls this method).
   *
   * @private
   * @returns {Object} - The hidden collection of nodes.
   */
  toJSON () {
    return this[nodes];
  }

}
