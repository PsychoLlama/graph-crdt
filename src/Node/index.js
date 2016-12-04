/**
 * @module graph-crdt.Node
 */

import Emitter from 'eventemitter3';
import time from '../time';
import { v4 as uuid } from 'uuid';
import { state } from '../union';

const node = Symbol('source object');
const defer = Symbol('defer method');

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
  static 'from' (object) {
    const instance = Node.create();
    const state = time();

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
   * const original = Node.create().merge({ data: 'intact' })
   * const serialized = JSON.stringify(original)
   * const parsed = JSON.parse(serialized)
   *
   * const node = Node.source(parsed)
   * node.read('data') // 'intact'
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
  read (field) {
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
    const meta = '@object';

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
   * List all the values in a node.
   *
   * @returns {Mixed[]} - The list of values.
   */
  values () {
    return this.keys().map((key) => this.read(key));
  }

  /**
   * Return a list of keys and values, just like `Object.entries`.
   *
   * @returns {Array[]} - A list of key-value pairs.
   */
  entries () {
    return this.keys().map((key) => {

     /** The value at that key. */
      const value = this.read(key);

     /** Map to a key-value pair. */
      return [key, value];
    });
  }

  /**
   * Schedule updates that have been deferred.
   *
   * @private
   * @param  {String} key - The key to defer.
   * @param  {Object} deferred - The value/state to defer.
   * @param  {Number} clock - The current system time.
   * @returns {undefined}
   */
  [defer] (key, deferred, clock) {

    const { value, state } = deferred;

    setTimeout(() => {
      const incoming = Node.source({
        [key]: { value, state },
      });

      this.merge(incoming);
    }, state - clock);
  }

  /**
   * merge - description
   *
   * @param  {Node} incoming - The node to merge from.
   * If a plain object is passed, it will be upgraded to a node
   * using `Node.from`.
   * @returns {Node} - The `this` context.
   */
  merge (incoming) {

    if (!(incoming instanceof Node)) {
      incoming = Node.from(incoming);
    }

    const clock = time();
    const history = {};
    const updates = {};
    const future = {};
    let overwritten = false;
    let changed = false;
    let deferring = false;

    incoming.keys().forEach((key) => {
      const current = this.meta(key);
      const next = incoming.meta(key);
      const timeline = { [next.state]: next };

      if (current) {
        timeline[current.state] = current;
      }

      const { update, deferred } = state(timeline, clock);

      if (update && update !== current) {
        updates[key] = this[node][key] = update;
        changed = true;
      }

      if (current) {
        history[key] = current;
        overwritten = true;
      }

      if (deferred) {
        future[key] = deferred;
        this[defer](key, deferred, clock);
        deferring = true;
      }
    });

    if (overwritten) {
      this.emit('historical', history);
    }
    if (changed) {
      this.emit('update', updates);
    }
    if (deferring) {
      this.emit('deferred', future);
    }

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
