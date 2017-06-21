/* eslint-env mocha */
import expect from 'expect';

import List from './index';

const entries = (list) => {
  const keys = Object.keys(list[List.object]).filter((key) => (
    key !== List.metadata && key !== List.first && key !== List.last
  ));

  return keys.map((key) => [key, list.meta(key)]);
};

// Helper function - locates an index/metadata pair in a list.
const findItem = (list, value) => {
  const item = entries(list).find(([, meta]) => meta.value === value);

  if (!item) {
    throw new Error(`Could not find value "${value}" in list.`);
  }

  return item;
};

describe('List static', () => {
  describe('from()', () => {
    it('returns a List', () => {
      const result = List.from([]);

      expect(result).toBeA(List);
    });

    it('can create lists from single item arrays', () => {
      const data = [1];
      const result = List.from(data);

      expect([...result]).toEqual(data);
    });

    it('attaches pointers to first and last items', () => {
      const data = [1];
      const result = List.from(data);

      const [index] = Object.keys(result[List.object]).filter((key) => (
        key !== List.first && key !== List.last && key !== List.metadata
      ));

      expect(result.meta(index)).toEqual({
        value: 1,
        prev: null,
        next: null,
      });
    });

    it('attaches pointers to each item', () => {
      const data = [1, 2];
      const result = List.from(data);

      const [index1, first] = findItem(result, 1);
      const [index2, second] = findItem(result, 2);

      expect(first.prev).toBe(null, 'Previous pointer should be null');
      expect(first.next).toBe(index2, 'Pointer to next item is missing');

      expect(second.prev).toBe(index1, 'Next pointer should be null');
      expect(second.next).toBe(null, 'Pointer to previous item is missing');
    });

    it('works with generators', () => {
      function * iterable () {
        yield 'something';
      }

      const result = List.from(iterable());

      expect([...result]).toEqual(['something']);
    });

    it('works with iterable objects', () => {
      const obj = {
        * [Symbol.iterator] () {
          yield 10;
        },
      };

      const result = List.from(obj);

      expect([...result]).toEqual([10]);
    });

    it('sets the link to the first item', () => {
      const result = List.from([1, 2, 3]);

      const [index] = findItem(result, 1);

      expect(result.value(List.first)).toBe(index);
    });

    it('sets the link to the last item', () => {
      const result = List.from([1, 2, 3]);

      const [index] = findItem(result, 3);

      expect(result.value(List.last)).toBe(index);
    });
  });
});

describe('List', () => {
  let list;

  beforeEach(() => {
    list = new List();
  });

  it('is initialized empty', () => {
    expect([...list]).toEqual([]);
  });

  describe('append()', () => {
    it('adds an item', () => {
      list.append('value');

      expect([...list]).toEqual(['value']);
    });

    it('returns the new index', () => {
      const index = list.append('item');

      expect(index).toBeA('string');
      expect(list.value(index)).toBe('item');
    });

    it('links to the preceeding item', () => {
      const first = list.append('value');
      const second = list.append('value');

      expect(list.meta(second).prev).toBe(first);
    });

    it('sets the preceeding item to null if it is first', () => {
      const index = list.append('value');

      expect(list.meta(index).prev).toBe(null);
    });

    it('sets the index for the last value', () => {
      const index = list.append(10);

      expect(list.meta(index).next).toBe(null);
    });
  });

  describe('iterator', () => {
    it('yields nothing if the list is empty', () => {
      expect([...list]).toEqual([]);
    });

    it('yields every value', () => {
      list.append('content');

      expect([...list]).toEqual(['content']);
    });
  });
});
