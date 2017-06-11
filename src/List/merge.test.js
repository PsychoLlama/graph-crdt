/* eslint-env mocha */
import expect from 'expect';

import Entity from '../Entity';
import List from './index';

describe('List merge', () => {
  let list;

  beforeEach(() => {
    list = new List();
  });

  it('adds nothing when an empty list is merged', () => {
    const update = new List();
    list.merge(update);

    expect([...list]).toEqual([]);
  });

  it('adds new fields', () => {
    const update = new List();
    update[Entity.object].field = { value: 'member', state: 1 };

    list.merge(update);

    expect([...list]).toEqual(['member']);
  });

  it('ignores stale updates', () => {
    const update = new List();
    update[Entity.object].field = { value: 'old', state: 1 };
    list[Entity.object].field = { value: 'new', state: 2 };

    list.merge(update);

    expect([...list]).toEqual(['new']);
  });

  it('overwrites stale data', () => {
    const update = new List();
    update[Entity.object].field = { value: 'new', state: 2 };
    list[Entity.object].field = { value: 'old', state: 1 };

    list.merge(update);

    expect([...list]).toEqual(['new']);
  });

  it('sets the first item in the list', () => {
    const update = new List();
    update[Entity.object].field = { value: 'item', state: 1 };
  });
});
