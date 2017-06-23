/**
 * @module graph-crdt.Node
 */

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

    // Figure out what's different.
    const delta = this.delta(incoming);

    // Apply every update.
    for (const [field] of delta.update) {
      const metadata = delta.update.meta(field);

      if (this.state(field) === incoming.state(field)) {
        this.emit('conflict', metadata, this.meta(field));
      }

      // Apply the update.
      this[Node.object][field] = metadata;
    }

    // Emit changes.
    if ([...delta.history].length) {
      this.emit('history', delta.history);
    }

    // Emit overwritten values.
    if ([...delta.update].length) {
      this.emit('update', delta.update);
    }

    return delta;
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
