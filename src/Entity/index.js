import Emitter from 'eventemitter3';
import uuid from 'uuid/v4';

/**
 * Defines a generic interface to the data structure.
 * Does not implement merge logic.
 * @class Entity
 */
export default class Entity extends Emitter {
  static object = Symbol('Internal node data structure');
  static metadata = '@object';

  /**
   * Take an object and use it as the data source for a new
   * node. This method is used with properly formatted
   * objects, such as stringified, then parsed node instances.
   *
   * @param  {Object} object - The preformatted object.
   * @returns {Node} - A new node instance.
   *
   * @example
   * const original = new Entity()
   * original.merge({ data: 'intact' })
   * const serialized = JSON.stringify(original)
   * const parsed = JSON.parse(serialized)
   *
   * const entity = Entity.source(parsed)
   * entity.value('data') // 'intact'
   */
  static source (object) {
    const entity = new this();

    entity[Entity.object] = object;

    return entity;
  }

  /**
   * @param  {Object} [config] - Overrides default properties.
   * @param  {String} [config.uid] - Sets the entity ID.
   */
  constructor ({ uid = uuid() } = {}) {
    super();

    this[Entity.object] = {
      [Entity.metadata]: { uid },
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

      // Returns the object metadata if no field is specified.
      return this[Entity.object][Entity.metadata];
    }

    // Returns the field given, and null if metadata isn't found.
    return this[Entity.object][field] || null;
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
    if (field === Entity.metadata) {
      return undefined;
    }

    // Gets the field metadata.
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

    // Get the field metadata.
    const meta = this.meta(field);

    return meta ? meta.state : 0;
  }

  /**
   * Sets metadata for a field, bumping the current state.
   * @param  {String} field - A field to update.
   * @param  {Object} metadata - What metadata the field should contain.
   * @return {Object} - The metadata object (not the same one given).
   */
  setMetadata (field, metadata) {
    const state = this.state(field) + 1;

    const update = this.new();
    update[Entity.object][field] = { ...metadata, state };

    return this.merge(update);
  }

  /**
   * Takes a snapshot of the current state.
   * @return {Object} - Every key and value (currently) in the node.
   */
  snapshot () {
    const object = {};

    for (const [key, value] of this) {
      object[key] = value;
    }

    return object;
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
        rebased[Entity.object][key] = {
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
        shared[Entity.object][field] = this.meta(field);
      }
    }

    return shared;
  }


  // Coercion interfaces

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
   * @returns {Object} - The underlying data.
   */
  toJSON () {
    return this[Entity.object];
  }
}
