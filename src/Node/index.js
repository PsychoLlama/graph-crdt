/**
 * @module graph-crdt.Node
 */

import Emitter from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { conflict } from '../union';

const node = Symbol('source object');

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

      result[node][field] = { value, state };
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
export default class Node extends Emitter {

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
        instance[node][key] = { value, state };
      }
    }

    return instance;
  }

  /**
   * Take an object and use it as the data source for a new
   * node. This method is used with properly formatted
   * objects, such as stringified, then parsed node instances.
   *
   * @param  {Object} object - The preformatted object.
   * @returns {Node} - A new node instance.
   *
   * @example
   * const original = Node.create()
   * original.merge({ data: 'intact' })
   * const serialized = JSON.stringify(original)
   * const parsed = JSON.parse(serialized)
   *
   * const node = Node.source(parsed)
   * node.value('data') // 'intact'
   */
  static source (object) {
    const instance = Node.create();
    instance[node] = object;

    return instance;
  }

  constructor (config = {}) {

    super();

    const uid = config.uid || uuid();

    this[node] = {
      '@object': { uid },
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
  value (field) {
    if (field === '@object') {
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
   * Get the current state of a property.
   *
   * @param  {String} field - Property name.
   * @returns {Number} - Current lamport state (or 0).
   */
  state (field) {

    /** Get the field metadata. */
    const meta = this.meta(field);

    return meta ? meta.state : 0;
  }

  /**
   * Takes the changes from the current node and plays them after the
   * changes in the target node.
   * Similar to git rebase, but without the conflicts.
   * @param  {Node} target - Preceding state.
   * @return {Node} - A new, rebased node.
   */
  rebase (target) {
    const rebased = this.new();

    rebased.merge(target);
    rebased.merge(this);

    // Bump state for older fields.
    for (const [key] of this) {
      if (target.state(key) >= this.state(key)) {

        // Avoids mutation of metadata.
        rebased[node][key] = {
          ...this.meta(key),
          state: target.state(key) + 1,
        };
      }
    }

    return rebased;
  }

  /**
   * Calculates the intersection between two nodes.
   * @param  {Node} target - Any other node.
   * @return {Node} - A collection of fields common to both nodes.
   */
  overlap (target) {
    const shared = this.new();

    for (const [field] of this) {
      if (this.state(field) && target.state(field)) {
        shared[node][field] = this.meta(field);
      }
    }

    return shared;
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

    /** Track all mutations. */
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

      /** Handle conflicts. */
      if (state.current === state.incoming) {
        const winner = conflict(current, update);

        /** No further action needed. */
        if (winner === current) {
          continue;
        }

        /** Replace the current value */
        this.emit('conflict', update, current);
        forceUpdate = true;
      }

      if (state.current < state.incoming || forceUpdate) {

        /** Track overwritten values. */
        if (current) {
          changes.history[node][field] = current;
        }

        changes.update[node][field] = update;

        /** Immediately apply updates. */
        this[node][field] = update;
      } else {
        changes.history[node][field] = update;
      }
    }

    /** Only emit when there's a change. */
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
    const object = this[node];
    const meta = '@object';

    /** Iterate over the source object. */
    for (const key in object) {

      /** Ignore prototype values and node metadata. */
      if (object.hasOwnProperty(key) && key !== meta) {
        const value = this.value(key);
        yield [key, value];
      }

    }
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

  /**
   * Returns the actual object, called when JSON needs something
   * to stringify. Obviously dangerous as it exposes the object
   * to untracked mutation. Please don't use it.
   *
   * @private
   * @returns {Object} - The actual node object.
   */
  toJSON () {
    return this[node];
  }
}
