/* eslint-env mocha */
import { toObject } from '../test-helpers';
import expect, { createSpy } from 'expect';
import Node from './index';
import time from '../time';

describe('A node merge', () => {

  let node;

  beforeEach(() => {
    node = new Node();
  });

  it('should namespace to avoid conflicts', () => {
    node.merge({ read: 'not a function' });
    expect(node.value).toBeA(Function);
  });

  it('should convert POJOs into Nodes', () => {
    node.merge({ data: 'success' });
    expect(node.value('data')).toBe('success');
  });

  it('should use the same node ID for new change nodes', () => {
    const { update, history, deferred } = node.merge({});
    const { uid } = node.meta();

    expect(update.meta()).toContain({ uid });
    expect(history.meta()).toContain({ uid });
    expect(deferred.meta()).toContain({ uid });
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
      expect(node.value('data')).toBe(false);

      incoming.merge({ data: true });
      node.merge(incoming);

      expect(node.value('data')).toBe(true);
    });

    it('should emit `update` after updates', () => {
      const spy = createSpy();
      node.on('update', spy);

      node.merge({ data: 'yep' });

      const [value] = spy.calls[0].arguments;
      expect(value).toBeA(Node);

      const object = toObject(value);
      expect(object).toEqual({
        data: 'yep',
      });
    });

    it('should return the updates', () => {
      const { update } = node.merge({ data: 'yep' });
      expect(update).toBeA(Node);

      const object = toObject(update);
      expect(object).toEqual({
        data: 'yep',
      });
    });

    it('should not emit `update` without updates', () => {
      const spy = createSpy();
      node.on('update', spy);

        // No properties.
      node.merge({});

      expect(spy).toNotHaveBeenCalled();
    });

    it('should not emit `update` for the same update', () => {
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

    it('should not overwrite more recent properties', () => {
        // Stale update.
      incoming.merge({ hello: 'Mars' });
      incoming.meta('hello').state = time() - 10;

        // Fresh state.
      node.merge({ hello: 'World' });

      node.merge(incoming);

      expect(node.value('hello')).toBe('World');

    });

    it('should add new properties', () => {
        // Really old state, but it's new to `node`.
      incoming.merge({ success: true });
      incoming.meta('success').state = time() - 100000;

      node.merge(incoming);

      expect(node.value('success')).toBe(true);
    });

    it('should return the history', () => {
      incoming.merge({ old: true });
      incoming.meta('old').state = time() - 100;
      node.merge({ old: false });

      const { history } = node.merge(incoming);

      expect(history).toBeA(Node);
      const object = toObject(history);

      expect(object).toEqual({
        old: true,
      });
    });

    it('should include overwritten values in history', () => {
      node.merge({ old: true });
      const { history } = node.merge({ old: false });

      const object = toObject(history);
      expect(object).toEqual({
        old: true,
      });
    });

    it('should emit `history` if updates are outdated', () => {
      incoming.merge({ data: 'old state' });
      incoming.meta('data').state = time() - 10;

      node.merge({ data: 'new state' });

      const spy = createSpy();
      node.on('history', spy);

      node.merge(incoming);
      const [history] = spy.calls[0].arguments;

      expect(history).toBeA(Node);

      const object = toObject(history);
      expect(object).toEqual({
        data: 'old state',
      });
    });

    it('should not emit `history` without stale updates', () => {

      const spy = createSpy();
      node.on('history', spy);

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

    let incoming, clock;

    beforeEach(() => {
      incoming = Node.create();
      clock = time();
    });

    it('should not merge until that state is reached', (done) => {
      incoming.merge({ future: true });
      incoming.meta('future').state = clock + 5;
      node.merge(incoming);

      expect(node.value('future')).toNotExist();

      setTimeout(() => {
        expect(node.value('future')).toBe(true);
        done();
      }, 10);
    });

    it('should retry the merge later, not overwrite', (done) => {
      incoming.merge({ future: true });
      incoming.meta('future').state = clock + 10;
      node.merge(incoming);

        // If it's going through `merge`,
        // the update event should fire.
      node.on('update', (update) => {
        const state = toObject(update);
        expect(state.future).toExist();
        done();
      });
    });

    it('should return the deferred items', () => {
      incoming.merge({ future: true });
      incoming.meta('future').state = clock + 100;

      const { deferred } = node.merge(incoming);

      expect(deferred).toBeA(Node);
      const object = toObject(deferred);
      expect(object).toEqual({
        future: true,
      });
    });

    it('should emit `deferred` when deferred updates come in', () => {
      const spy = createSpy();
      incoming.merge({ future: true });
      incoming.meta('future').state = clock + 10;

      node.on('deferred', spy);

      node.merge(incoming);

      expect(spy).toHaveBeenCalled();
      const [deferred] = spy.calls[0].arguments;
      expect(deferred).toBeA(Node);

      const object = toObject(deferred);
      expect(object).toEqual({
        future: true,
      });
    });

    it('should not emit `deferred` without deferred updates', () => {
      const spy = createSpy();
      node.on('deferred', spy);

      node.merge({ data: true });
      expect(spy).toNotHaveBeenCalled();
    });

    it('should carry over to copied nodes', () => {
      incoming.merge({ future: true });
      incoming.meta('future').state = clock + 100;

      node.merge(incoming);

      const copy = new Node();

      expect(copy.deferred.size).toBe(0);
      copy.merge(node);
      expect(copy.deferred.size).toBe(1);
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

    it('should be ignored if it loses', () => {
      const { update, history, deferred } = node.merge(conflict);

      expect(toObject(update)).toEqual({});
      expect(toObject(history)).toEqual({});
      expect(toObject(deferred)).toEqual({});
    });

    it('should trigger an update if it wins', () => {
      node.meta('value').value = '1';

      const { update } = node.merge(conflict);

      expect(toObject(update)).toEqual({
        value: '5',
      });
    });

    it('should emit `conflict` if it wins', () => {
      const spy = createSpy();
      node.on('conflict', spy);

      const current = node.meta('value');
      const update = conflict.meta('value');

      current.value = '1';

      node.merge(conflict);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(update, current);
    });

    it('should not emit `conflict` if it loses', () => {
      const spy = createSpy();
      node.on('conflict', spy);

      node.merge(conflict);

      expect(spy).toNotHaveBeenCalled();
    });

  });

});
