/* eslint-env mocha */
import { toObject } from '../test-helpers';
import expect from 'expect';
import Node from './index';

describe('Node static method', () => {
  describe('"from"', () => {
    it('turns a POJO into a node', () => {
      const node = Node.from({});

      expect(node).toBeA(Node);
    });

    it('imports the properties from the target object', () => {
      const date = new Date('1 Jan 1980');
      const node = Node.from({
        name: 'Sam',
        birthday: date,
      });

      expect(node.value('name')).toBe('Sam');
      expect(node.value('birthday')).toBe(date);
    });

    it('provides an initial state', () => {
      const node = Node.from({ name: 'Alvin' });

      expect(node.state('name')).toBe(1);
    });
  });

  describe('"source"', () => {
    it('creates a node that draws from an object', () => {
      const node = Node.create();
      node.merge({ data: 'intact' });
      const string = JSON.stringify(node);
      const object = JSON.parse(string);
      const copy = Node.source(object);
      expect(copy.value('data')).toBe('intact');
    });
  });
});

describe('Node', () => {
  let node;

  beforeEach(() => {
    node = Node.create();
  });

  /* Generic tests */
  it('does not have properties upon creation', () => {
    const keys = [...node].map(([key]) => key);
    expect(keys.length).toBe(0);
  });

  it('returns the uid when `toString` is called', () => {
    const result = node.toString();
    const { uid } = node.meta();
    expect(result).toBe(uid);
  });

  it('returns the node when `toJSON` is called', () => {
    node.merge({ 'json worked': true });
    const result = JSON.stringify(node);

    expect(result).toContain('json worked');
  });

  /* Not so generic tests */
  describe('uid', () => {
    it('exists on creation', () => {
      const { uid } = node.meta();
      expect(uid).toNotBe(undefined);
    });

    it('is unique', () => {
      const { uid: uid1 } = Node.create().meta();
      const { uid: uid2 } = Node.create().meta();

      expect(uid1).toNotBe(uid2);
    });

    it('uses the configuration provided', () => {
      const node = Node.create({ uid: 'custom' });
      const { uid } = node.meta();
      expect(uid).toBe('custom');
    });
  });

  describe('state()', () => {
    it('returns 0 when there is no property', () => {
      const state = node.state('no such key');
      expect(state).toBe(0);
    });
  });

  describe('meta()', () => {
    it('returns null if no values exist', () => {
      const result = node.meta('no such key');
      expect(result).toBe(null);
    });

    it('returns the metadata if the field exists', () => {
      node.merge({ name: 'Steve' });
      const result = node.meta('name');
      expect(result).toBeAn(Object);
    });
  });

  describe('Symbol.iterator()', () => {
    it('skips the node metadata field', () => {
      node.merge({ name: 'John' });
      const keys = [...node].map(([key]) => key);

      // Should not contain '@object'.
      expect(keys).toEqual(['name']);
    });

    it('includes key/value pairs for every field', () => {
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

  describe('value()', () => {
    it('returns undefined if the key cannot be found', () => {
      const result = node.value('no such key');
      expect(result).toBe(undefined);
    });

    it('returns undefined if called on reserved fields', () => {

      // Please, never do this in your code.
      node.meta().value = 'failure!';

      const result = node.value('@object');
      expect(result).toBe(undefined);
    });
  });

  describe('new()', () => {
    it('creates a node with the same ID', () => {
      const { uid } = node.meta();
      const copy = node.new();

      expect(copy.meta()).toContain({ uid });
    });

    it('does not carry over any properties', () => {
      node.merge({ original: true });
      const copy = node.new();

      expect(toObject(copy)).toEqual({});
    });
  });

  describe('rebase()', () => {
    let target;

    beforeEach(() => {
      target = new Node();
    });

    it('is a function', () => {
      expect(node.rebase).toBeA(Function);
    });

    it('returns a new node', () => {
      const result = node.rebase();

      expect(result).toBeA(Node);
      expect(result).toNotBe(node);
    });

    it('returns the same node id', () => {
      const { uid } = node.rebase(target).meta();

      expect(uid).toBe(node.meta().uid);
    });

    it('does not change state if the node is empty', () => {
      node.merge({ initial: true });
      const result = node.rebase(target);

      expect(result.state('initial')).toBe(1);
    });

    it('does not change state if the fields do not overlap', () => {
      node.merge({ initial: true });
      target.merge({ different: true });
      target.meta('different').state = 2001;
      const result = node.rebase(target);

      expect(result.state('initial')).toBe(1);
    });

    it('increments the state for overlapping fields', () => {
      node.merge({ existing: 'should replace' });
      target.merge({ existing: 'replace me', different: true });
      const result = node.rebase(target);

      expect(result.state('existing')).toBe(2);
      expect(result.state('different')).toBe(1);
    });

    it('does not mutate field metadata', () => {
      node.merge({ old: false });
      target.merge({ old: true });

      const result = node.rebase(target);

      expect(result.meta('old'))
        .toNotBe(node.meta('old'))
        .toNotBe(target.meta('old'))
        .toNotContain({ state: 1 });
    });

    it('does not change fields which are already greater', () => {
      const state = 20000;
      node.merge({ old: false });
      node.meta('old').state = state;
      target.merge({ old: true });

      const result = node.rebase(target);

      expect(result.state('old')).toBe(state);
    });
  });
});
