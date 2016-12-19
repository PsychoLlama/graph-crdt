/* eslint-env mocha */
import { toObject } from '../test-helpers';
import expect, { spyOn } from 'expect';
import Node from './index';
import time from '../time';

describe('Node static method', () => {

  describe('"from"', function () {

    // Using system time can cause race conditions.
    this.retries(1);

    it('should turn a POJO into a node', () => {
      const node = Node.from({});

      expect(node).toBeA(Node);
    });

    it('should import the properties from the target object', () => {
      const date = new Date('1 Jan 1980');
      const node = Node.from({
        name: 'Sam',
        birthday: date,
      });

      expect(node.read('name')).toBe('Sam');
      expect(node.read('birthday')).toBe(date);
    });

    it('should set the state to the current time', () => {
      const now = new Date().getTime();
      const node = Node.from({ name: 'Alvin' });

      expect(node.state('name'))
      .toBeLessThan(now + 5)
      .toBeGreaterThan(now - 5);
    });

  });

  describe('"source"', () => {

    it('should create a node that draws from an object', () => {
      const node = Node.create();
      node.merge({ data: 'intact' });
      const string = JSON.stringify(node);
      const object = JSON.parse(string);
      const copy = Node.source(object);
      expect(copy.read('data')).toBe('intact');
    });

  });

});

describe('A node', () => {

  let node;

  beforeEach(() => {
    node = Node.create();
  });

  /* Generic tests */
  it('should not have properties upon creation', () => {
    const keys = [...node].map(([key]) => key);
    expect(keys.length).toBe(0);
  });

  it('should return the uid when `toString` is called', () => {
    const result = node.toString();
    const { uid } = node.meta();
    expect(result).toBe(uid);
  });

  it('should return the node when `toJSON` is called', () => {
    node.merge({ 'json worked': true });
    const result = JSON.stringify(node);

    expect(result).toContain('json worked');
  });

  /* Not so generic tests */
  describe('uid', () => {

    it('should exist on creation', () => {
      const { uid } = node.meta();
      expect(uid).toNotBe(undefined);
    });

    it('should be unique', () => {
      const { uid: uid1 } = Node.create().meta();
      const { uid: uid2 } = Node.create().meta();

      expect(uid1).toNotBe(uid2);
    });

    it('should use the configuration provided', () => {
      const node = Node.create({ uid: 'custom' });
      const { uid } = node.meta();
      expect(uid).toBe('custom');
    });

  });

  describe('field state lookup', () => {

    it('should return -Infinity when there is no property', () => {
      const state = node.state('no such key');
      expect(state).toBe(-Infinity);
    });

  });

  describe('field metadata lookup', () => {

    it('should return null if no values exist', () => {
      const result = node.meta('no such key');
      expect(result).toBe(null);
    });

    it('should return the metadata if the field exists', () => {
      node.merge({ name: 'Steve' });
      const result = node.meta('name');
      expect(result).toBeAn(Object);
    });

  });

  describe('iterator', () => {

    it('should skip the node metadata field', () => {
      node.merge({ name: 'John' });
      const keys = [...node].map(([key]) => key);

      // Should not contain '@object'.
      expect(keys).toEqual(['name']);
    });

    it('should include key/value pairs for every field', () => {
      node.merge({
        name: 'Stewart',
        tier: 'premium',
      });

      const pairs = [...node];

      expect(pairs).toEqual([
        ['name', 'Stewart'],
        ['tier', 'premium'],
      ]);
    });

  });

  describe('property lookup', () => {

    it('should return undefined if the key cannot be found', () => {
      const result = node.read('no such key');
      expect(result).toBe(undefined);
    });

    it('should return undefined if called on reserved fields', () => {

      // Please, never do this in your code.
      node.meta().value = 'failure!';

      const result = node.read('@object');
      expect(result).toBe(undefined);
    });

  });

  describe('state comparison', () => {

    let node, update;
    beforeEach(() => {
      node = Node.from({ old: true });
      update = Node.from({ old: false });
    });

    it('should mark newer values as updates', () => {
      const state = node.compare('old', update, time());
      expect(state).toBe('update');
    });

    it('should mark older values as history', () => {
      const state = update.compare('old', node, time());
      expect(state).toBe('history');
    });

    it('should mark future values as deferred', () => {
      const clock = time();

      // Future state.
      update.meta('old').state = clock + 1000;

      const state = node.compare('old', update, clock);

      expect(state).toBe('deferred');
    });

    it('should return `conflict` on conflicts', () => {

      // Same state.
      node.merge({ old: 1 });
      update.merge({ old: 2 });
      node.meta('old').state = update.meta('old').state;

      const state = node.compare('old', update, time());
      expect(state).toBe('conflict');
    });

    it('should mark new fields as updates', () => {
      update.merge({ feature: 'new property!' });
      const state = node.compare('feature', update, time());
      expect(state).toBe('update');
    });

  });

  describe('"schedule" call', () => {
    let node, deferred, clock, timeout;

    beforeEach(() => {
      node = new Node();
      deferred = new Node();
      clock = time();
      timeout = spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      timeout.restore();
    });

    it('should schedule the next merge', () => {
      const offset = 100;
      deferred.merge({ stuff: true });
      deferred.meta('stuff').state = clock + offset;

      node.schedule(deferred, clock);

      expect(timeout).toHaveBeenCalled();
      const [, time] = timeout.calls[0].arguments;
      expect(time).toBe(offset);
    });

    it('should merge the deferred values when ready', () => {
      const merge = spyOn(node, 'merge');
      deferred.merge({ next: 'value' });
      deferred.meta('next').state = clock + 150;
      node.schedule(deferred, clock);

      const [callback] = timeout.calls[0].arguments;
      callback();
      expect(merge).toHaveBeenCalled();
      const [update] = merge.calls[0].arguments;
      expect(toObject(update)).toEqual({
        next: 'value',
      });
      merge.restore();
    });

    it('should update the set of deferred items', () => {
      deferred.merge({ future: true });
      deferred.meta('future').state = clock + 100;

      const scheduled = node.schedule(deferred, clock);
      expect(node.deferred).toBeA(Set);

      const update = scheduled[100];
      expect(node.deferred.has(update)).toBe(true);

      const [callback] = timeout.calls[0].arguments;
      callback();

      expect(node.deferred.has(update)).toBe(false);
    });

    it('should return the scheduled updates', () => {
      const offset = {
        small: 200,
        large: 500,
      };

      deferred.merge({
        change: true,
        update: 'hello',
      });

      deferred.meta('change').state = clock + offset.large;
      deferred.meta('update').state = clock + offset.small;

      const scheduled = node.schedule(deferred, clock);

      let object = toObject(scheduled[offset.large]);
      expect(object).toEqual({ change: true });

      object = toObject(scheduled[offset.small]);
      expect(object).toEqual({ update: 'hello' });
    });

    it('should schedule each update', () => {
      deferred.merge({
        updates: true,
        changes: true,
      });

      deferred.meta('updates').state = clock + 200;
      deferred.meta('updates').state = clock + 500;

      node.schedule(deferred, clock);
      expect(timeout.calls.length).toBe(2);
    });

    it('should batch updates', () => {
      const offset = 100;

      deferred.merge({
        update: true,
        change: true,
      });

      deferred.meta('update').state = clock + 100;
      deferred.meta('change').state = clock + 100;

      const scheduled = node.schedule(deferred, clock);
      const object = toObject(scheduled[offset]);

      expect(object).toEqual({
        change: true,
        update: true,
      });

      expect(timeout.calls.length).toBe(1);
    });

  });

});
