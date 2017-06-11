/* eslint-env mocha */
import expect from 'expect';

import Entity from '../Entity';
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

    it('sets the previous index', () => {
      const first = list.append('value');
      const second = list.append('value');

      expect(list.meta(second).prev).toBe(first);
    });

    it('sets the index for the last value', () => {
      const index = list.append(10);
      const last = list.value(List.last);

      expect(last).toBe(index);
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
