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

      let node = object[key];

      // Make sure it's a node.
      if (!(node instanceof Node)) {
        node = Node.source(node);
      }

      // Get it's unique ID.
      const { uid } = node.meta();

      // Add it to the new graph.
      graph[nodes][uid] = node;
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
  value (key) {
    return this[nodes][key] || null;
  }

  new () {
    return new Graph();
  }

  /**
   * Merge one graph with another (graph union operation).
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
      update: this.new(),
      history: this.new(),
    };

    for (const [uid, node] of graph) {
      let target = this.value(uid);

      if (!target) {
        target = this[nodes][uid] = node.new();
      }

      const { update, history } = target.merge(node);

      changes.update[nodes][uid] = update;
      changes.history[nodes][uid] = history;
    }

    this.emit('update', changes.update);
    this.emit('history', changes.history);

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
        const value = this.value(key);
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
