/* eslint-env mocha */
import expect from 'expect';

import List from './index';

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
