/**
 * @module graph-crdt.Node
 */

import { conflict } from '../union';
import Entity from '../Entity';

/**
 * Increments each state given an object of key/value pairs.
 * @private
 * @param  {Node} current - Current state.
 * @param  {Object} update - Key-value update pairs.
 * @return {Node} - Incremented update.
 */
const getIncrementedState = (current, update) => {
  const result = current.new();

  for (const field in update) {
    if (update.hasOwnProperty(field)) {
      const state = current.state(field) + 1;
      const value = update[field];

      result[Entity.object][field] = { value, state };
    }
  }

  return result;
};

/**
 * An observable object with conflict-resolution.
 *
 * @class Node
 * @param  {Object} [config] - Instance level configuration.
 * @param  {Object} [config.uid] - Override the randomly generated
 * node uid.
 */
export default class Node extends Entity {

  /**
   * Creates a new Node instance without using
   * `new`.
   *
   * @param {Object} [config] - The constructor configuration object.
   * @returns {Node} - The new node instance.
   */
  static create (config) {
    return new Node(config);
  }

  /**
   * Turns a normal object into a Node instance.
   * Properties to be imported must be enumerable
   * and cannot be inherited via prototype.
   *
   * @param  {Object} object - Any enumerable object.
   * @returns {Node} - A node interface constructed from the object.
   */
  static from (object) {
    const instance = Node.create();
    const state = 1;

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const value = object[key];
        instance[Node.object][key] = { value, state };
      }
    }

    return instance;
  }

  /**
   * Merges an update into the current node.
   *
   * @param  {Node} incoming - The node to merge from.
   * If a plain object is passed, it will be upgraded to a node
   * using `Node.from`.
   * @returns {Object} - A collection of changes caused by the merge.
   */
  merge (incoming) {
    if (!(incoming instanceof Node)) {
      incoming = getIncrementedState(this, incoming);
    }

    // Track all mutations.
    const changes = {
      history: this.new(),
      update: this.new(),
    };

    for (const [field] of incoming) {
      let forceUpdate = false;

      const current = this.meta(field);
      const update = incoming.meta(field);
      const state = {
        incoming: incoming.state(field),
        current: this.state(field),
      };

      // Handle conflicts.
      if (state.current === state.incoming) {
        const winner = conflict(current, update);

        // No further action needed.
        if (winner === current) {
          continue;
        }

        // Replace the current value.
        this.emit('conflict', update, current);
        forceUpdate = true;
      }

      if (state.current < state.incoming || forceUpdate) {

        // Track overwritten values.
        if (current) {
          changes.history[Node.object][field] = current;
        }

        changes.update[Node.object][field] = update;

        // Immediately apply updates.
        this[Node.object][field] = update;
      } else {
        changes.history[Node.object][field] = update;
      }
    }

    // Only emit when there's a change.
    const changed = [...changes.update].length > 0;
    const overwritten = [...changes.history].length > 0;

    if (overwritten) {
      this.emit('history', changes.history);
    }
    if (changed) {
      this.emit('update', changes.update);
    }

    return changes;
  }

  /**
   * Creates an empty instance with the same configuration.
   * @return {Node} - A new node instance with the same properties.
   */
  new () {
    const { uid } = this.meta();
    const clone = new Node({ uid });

    return clone;
  }

  /**
   * Iterates over the node keys & values, ignoring metadata.
   * @return {Array} - Each value yielded is a [key, value] pair.
   */
  * [Symbol.iterator] () {
    const object = this[Node.object];
    const meta = Node.metadata;

    // Iterate over the source object.
    for (const key in object) {

      // Ignore prototype values and node metadata.
      if (object.hasOwnProperty(key) && key !== meta) {
        const value = this.value(key);
        yield [key, value];
      }
    }
  }
}
