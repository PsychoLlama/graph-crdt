/* eslint-env mocha */
import { toObject } from '../test-helpers';
import expect, { createSpy } from 'expect';
import Node from './index';

describe('A node merge', () => {
  let node;

  beforeEach(() => {
    node = new Node();
  });

  it('namespaces to avoid conflicts', () => {
    node.merge({ read: 'not a function' });
    expect(node.value).toBeA(Function);
  });

  it('converts POJOs into Nodes', () => {
    node.merge({ data: 'success' });
    expect(node.value('data')).toBe('success');
  });

  it('uses the same node ID for new change nodes', () => {
    const { update, history } = node.merge({});
    const { uid } = node.meta();

    expect(update.meta()).toContain({ uid });
    expect(history.meta()).toContain({ uid });
  });

  describe('within operating state bounds', () => {
    it('adds all new properties', () => {
      const update = Node.from({ data: true });
      node.merge(update);

      const keys = [...node].map(([key]) => key);
      expect(keys).toContain('data');
    });

    it('updates existing properties', () => {
      const incoming = Node.from({ data: false });
      node.merge(incoming);
      expect(node.value('data')).toBe(false);

      incoming.merge({ data: true });
      node.merge(incoming);

      expect(node.value('data')).toBe(true);
    });

    it('emits `update` after updates', () => {
      const spy = createSpy();
      node.on('update', spy);

      node.merge({ data: 'yep' });

      const [value] = spy.calls[0].arguments;
      expect(value).toBeA(Node);

      const object = toObject(value);
      expect(object).toEqual({ data: 'yep' });
    });

    it('returns the updates', () => {
      const { update } = node.merge({ data: 'yep' });
      expect(update).toBeA(Node);

      const object = toObject(update);
      expect(object).toEqual({
        data: 'yep',
      });
    });

    it('does not emit `update` without updates', () => {
      const spy = createSpy();
      node.on('update', spy);

        // No properties.
      node.merge({});

      expect(spy).toNotHaveBeenCalled();
    });

    it('does not emit `update` for the same update', () => {
      const spy = createSpy();
      node.on('update', spy);

      const update = Node.from({ update: true });

      node.merge(update);
      node.merge(update);

      expect(spy.calls.length).toBe(1);
    });
  });

  describe('in historical state', () => {
    let incoming;

    beforeEach(() => {
      incoming = Node.create();
    });

    it('does not overwrite more recent properties', () => {
        // Stale update.
      incoming.merge({ hello: 'Mars' });
      incoming.meta('hello').state = 1;

      const update = Node.from({ hello: 'World' });
      update.meta('hello').state = 2;

      node.merge(update);
      node.merge(incoming);

      expect(node.value('hello')).toBe('World');
    });

    it('adds new properties', () => {
        // Really old state, but it's new to `node`.
      incoming.merge({ success: true });
      incoming.meta('success').state = 10;

      node.merge(incoming);

      expect(node.value('success')).toBe(true);
    });

    it('returns the history', () => {
      incoming.merge({ old: true });
      incoming.meta('old').state = 1;
      node.merge({ old: false });
      node.meta('old').state = 2;

      const { history } = node.merge(incoming);

      expect(history).toBeA(Node);
      const object = toObject(history);

      expect(object).toEqual({ old: true });
    });

    it('includes overwritten values in history', () => {
      node.merge({ old: true });
      const { history } = node.merge({ old: false });

      const object = toObject(history);
      expect(object).toEqual({ old: true });
    });

    it('emits `history` if updates are outdated', () => {
      incoming.merge({ data: 'old state' });
      incoming.meta('data').state = 1;

      node.merge({ data: 'new state' });
      node.meta('data').state = 2;

      const spy = createSpy();
      node.on('history', spy);

      node.merge(incoming);
      const [history] = spy.calls[0].arguments;

      expect(history).toBeA(Node);

      const object = toObject(history);
      expect(object).toEqual({ data: 'old state' });
    });

    it('does not emit `history` without stale updates', () => {
      const spy = createSpy();
      node.on('history', spy);

      incoming.merge({ 'new property': 'yeah' });
      incoming.meta('new property').state = 1;

      node.merge({ hello: 'Earth' });

      node.merge(incoming);

      expect(spy).toNotHaveBeenCalled();
    });
  });

  describe('conflict', () => {
    let conflict;

    beforeEach(() => {
      conflict = new Node();

      node.merge({ value: '9' });
      conflict.merge({ value: '5' });

      // Same state.
      node.meta('value').state = conflict.meta('value').state;
    });

    it('is ignored if it loses', () => {
      const { update, history } = node.merge(conflict);

      expect(toObject(update)).toEqual({});
      expect(toObject(history)).toEqual({});
    });

    it('triggers an update if it wins', () => {
      node.meta('value').value = '1';

      const { update } = node.merge(conflict);

      expect(toObject(update)).toEqual({ value: '5' });
    });

    it('emits `conflict` if it wins', () => {
      const spy = createSpy();
      node.on('conflict', spy);

      const current = node.meta('value');
      const update = conflict.meta('value');

      current.value = '1';

      node.merge(conflict);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(update, current);
    });

    it('does not emit `conflict` if it loses', () => {
      const spy = createSpy();
      node.on('conflict', spy);

      node.merge(conflict);

      expect(spy).toNotHaveBeenCalled();
    });
  });
});
