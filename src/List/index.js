import uuid from 'uuid/v4';

import { conflict } from '../union';
import Entity from '../Entity';

const ignored = {};
const merge = {};


/**
 * Iterates over every field in a list.
 * @param  {List} list - Something to convert into a key set.
 * @return {Array} - All the public fields on the object.
 */
const keys = (list) => {
  const all = Object.keys(list[Entity.object]);

  return all.filter((key) => key !== Entity.metadata);
};

/**
 * A linked list.
 * @class List
 */
export default class List extends Entity {
  static first = '@first';
  static last = '@last';

  /**
   * Figures out which fields must be changed to successfully merge.
   * @param  {Entity} update - Any entity interface.
   * @return {Object} - A delta object.
   */
  delta (update) {
    const delta = super.delta(update);

    // Detect merge conflicts for first item indices.
    const hasConflict = {
      first: update.meta(List.first) && this.meta(List.first) &&
        update.state(List.first) === this.state(List.first) &&
        update.value(List.first) !== this.value(List.first),
    };

    if (hasConflict.first) {
      merge.first(this, update, delta);
    }

    keys(delta.update).forEach((field) => {
      const metadata = delta.update.meta(field);

      if (metadata.prev === null) {
        const update = {
          state: delta.update.state(List.first) + 1,
          value: field,
        };

        if (!this.state(List.first)) {
          delta.update[Entity.object][List.first] = update;
        }
      }

      if (metadata.next === null) {
        delta.update[Entity.object][List.last] = {
          state: delta.update.state(List.last) + 1,
          value: field,
        };
      }
    });

    return delta;
  }

  /**
   * Merges two lists together.
   * @param  {List} update - A collection of changes.
   * @return {undefined}
   */
  merge (update) {
    const delta = this.delta(update);

    keys(delta.update).forEach((field) => {
      const metadata = delta.update.meta(field);

      // Apply the update.
      this[Entity.object][field] = metadata;
    });

    return delta;
  }

  /**
   * Appends a value to the end of the list.
   * @param  {Mixed} value - A value.
   * @return {String} - The new unique ID of the appended value.
   */
  append (value) {
    const index = uuid();
    const prev = this.value(List.last) || null;
    const update = this.new();

    update[Entity.object][index] = { value, state: 1, prev, next: null };

    this.merge(update);

    return index;
  }

  /**
   * Yields every value in the list.
   * @private
   * @return {Mixed} - Each value in the list.
   */
  * [Symbol.iterator] () {
    const data = this[Entity.object];

    for (const field in data) {
      if (data.hasOwnProperty(field) && !ignored.hasOwnProperty(field)) {
        yield data[field].value;
      }
    }
  }
}

ignored[List.metadata] = true;
ignored[List.first] = true;
ignored[List.last] = true;

/**
 * Handle conflicts when two lists specify a different starting value.
 * @private
 * @param  {List} current - Current state.
 * @param  {List} update - A list update.
 * @param  {Object} delta - An object with an update and history field.
 * @return {undefined}
 */
merge.first = function (current, update, delta) {
  const meta = {
    current: current.meta(List.first),
    update: update.meta(List.first),
  };

  const winner = conflict(meta.current, meta.update);
  const loser = winner === meta.current ? meta.update : meta.current;

  if (winner === meta.update) {
    delta.update[Entity.object][List.first] = meta.update;
  }

  delta.update[Entity.object][winner.value] = {
    ...winner,
    next: loser.value,
  };

  delta.update[Entity.object][loser.value] = {
    ...loser,
    prev: winner.value,
  };
};
