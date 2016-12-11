import { describe, it, beforeEach } from 'mocha';
import Node from './index';
import time from '../time';
import expect from 'expect';
const { createSpy } = expect;

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
      const node = Node.create().merge({ data: 'intact' });
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

  describe('merge', () => {

    it('should return the `this` context', () => {
      const incoming = Node.from({ stuff: true });
      const result = node.merge(incoming);
      expect(result).toBe(node);
    });

    it('should namespace to avoid conflicts', () => {
      node.merge({ read: 'not a function' });
      expect(node.read).toBeA(Function);
    });

    it('should convert POJOs into Nodes', () => {
      node.merge({ data: 'success' });
      expect(node.read('data')).toBe('success');
    });

    describe('within operating state bounds', () => {

      it('should add all new properties', () => {
        const update = Node.from({ data: true });
        node.merge(update);

        const keys = [...node].map(([key]) => key);
        expect(keys).toContain('data');
      });

      it('should update existing properties', () => {
        const incoming = Node.from({ data: false });
        node.merge(incoming);
        expect(node.read('data')).toBe(false);

        incoming.merge({ data: true });
        node.merge(incoming);

        expect(node.read('data')).toBe(true);
      });

      it('should emit `update` after updates', () => {
        const spy = createSpy();
        node.on('update', spy);

        node.merge({ data: 'yep' });

        expect(spy).toHaveBeenCalledWith({
          data: node.meta('data'),
        });
      });

      it('should not emit `update` without updates', () => {
        const spy = createSpy();
        node.on('update', spy);

        // No properties.
        node.merge({});

        expect(spy).toNotHaveBeenCalled();
      });

    });

    describe('in historical state', () => {

      let incoming;

      beforeEach(() => {
        incoming = Node.create();
      });

      it('should not more recent properties', () => {
        // Stale update.
        incoming.merge({ hello: 'Mars' });
        incoming.meta('hello').state = time() - 10;

        // Fresh state.
        node.merge({ hello: 'World' });

        node.merge(incoming);

        expect(node.read('hello')).toBe('World');

      });

      it('should add new properties', () => {
        // Really old state, but it's new to `node`.
        incoming.merge({ success: true });
        incoming.meta('success').state = time() - 100000;

        node.merge(incoming);

        expect(node.read('success')).toBe(true);
      });

      it('should emit `historical` if updates are outdated', () => {
        incoming.merge({ data: 'old state' });
        incoming.meta('data').state = time() - 10;

        node.merge({ data: 'new state' });

        const spy = createSpy();
        node.on('historical', spy);

        node.merge(incoming);
        expect(spy).toHaveBeenCalledWith({
          data: node.meta('data'),
        });
      });

      it('should not emit `historical` without stale updates', () => {

        const spy = createSpy();
        node.on('historical', spy);

        incoming.merge({ 'new property': 'yeah' });
        incoming.meta('new property').state = time() - 10;

        node.merge({ hello: 'Earth' });

        node.merge(incoming);

        expect(spy).toNotHaveBeenCalled();

      });

    });

    describe('from the future', function () {

      // Time can be sketchy.
      this.retries(1);

      // This should be ample.
      this.timeout(500);

      let incoming;

      beforeEach(() => {
        incoming = Node.create();
      });

      it('should not merge until that state is reached', (done) => {
        incoming.merge({ future: true });
        incoming.meta('future').state = time() + 5;
        node.merge(incoming);

        expect(node.read('future')).toNotExist();

        setTimeout(() => {
          expect(node.read('future')).toBe(true);
          done();
        }, 10);
      });

      it('should retry the merge later, not overwrite', (done) => {
        incoming.merge({ future: true });
        incoming.meta('future').state = time() + 10;
        node.merge(incoming);

        // If it's going through `merge`,
        // the update event should fire.
        node.on('update', (state) => {
          expect(state.future).toExist();
          done();
        });
      });

      it('should emit `deferred` when deferred updates come in', () => {
        const spy = createSpy();
        incoming.merge({ future: true });
        incoming.meta('future').state = time() + 10;

        node.on('deferred', spy);

        node.merge(incoming);
        expect(spy).toHaveBeenCalledWith({
          future: incoming.meta('future'),
        });
      });

      it('should not emit `deferred` without deferred updates', () => {
        const spy = createSpy();
        node.on('deferred', spy);

        node.merge({ data: true });
        expect(spy).toNotHaveBeenCalled();
      });

    });

  });

});