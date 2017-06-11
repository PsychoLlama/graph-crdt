import uuid from 'uuid/v4';

import Entity from '../Entity';

const ignored = {};

/**
 * A linked list.
 * @class List
 */
export default class List extends Entity {
  static first = '@first';
  static last = '@last';

  /**
   * Merges two lists together.
   * @param  {List} update - A collection of changes.
   * @return {undefined}
   */
  merge (update) {
    Object.keys(update[Entity.object]).forEach((field) => {
      const state = {
        update: update.state(field),
        current: this.state(field),
      };

      if (state.update < state.current) {
        return;
      }

      const metadata = update.meta(field);
      this[Entity.object][field] = metadata;
    });
  }

  /**
   * Appends a value to the end of the list.
   * @param  {Mixed} value - A value.
   * @return {String} - The new unique ID of the appended value.
   */
  append (value) {
    const index = uuid();
    const prev = this.value(List.last);
    const update = new List();

    update[Entity.object][index] = { value, state: 1, prev };
    update[Entity.object][List.last] = { value: index, state: 1 };

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
