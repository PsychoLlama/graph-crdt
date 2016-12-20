/* eslint-env mocha */
import expect, { createSpy } from 'expect';
import { toObject } from '../test-helpers';
import Graph from '../Graph';
import Node from '../Node';
import time from '../time';

describe('Graph static method', () => {

  describe('"source"', () => {

    it('should use the input as it\'s data source', () => {
      const node = Node.create({ uid: 'member' });
      const graph = Graph.create();
      node.merge({ data: true });
      graph.merge({ [node]: node });

      const copy = Graph.source(graph.toJSON());
      expect(copy.read('member').value('data')).toBe(true);
    });

    it('should source nested POJOs into nodes', () => {
      const node = Node.create();
      node.merge({ data: true });
      const copy = JSON.parse(JSON.stringify(node));

      const graph = Graph.source({

        // "copy" is a plain object.
        'placeholder': copy,
      });

      const [key] = [...graph].map(([key]) => key);
      expect(graph.read(key)).toBeA(Node);
    });

  });

});

describe('A graph', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('should be initialized empty', () => {
    const keys = [...graph].map(([key]) => key);

    expect(keys.length).toBe(0);
  });

  it('should return the nodes when `toJSON` is called', () => {
    const node = Node.create({ uid: 'unique id' });
    node.merge({ data: 'intact' });
    graph.merge({ [node]: node });

    const string = JSON.stringify(graph);
    expect(string).toContain('unique id');
    expect(string).toContain('intact');
  });

  describe('iterator', () => {

    it('should list all the node indices', () => {
      const first = Node.create({ uid: 'first' });
      const second = Node.create({ uid: 'second' });

      graph.merge({
        [first]: first,
        [second]: second,
      });

      const entries = [...graph];

      expect(entries).toEqual([
        ['first', first],
        ['second', second],
      ]);
    });

  });

  describe('"read" call', () => {

    let node;

    beforeEach(() => {
      node = Node.create({ uid: 'dave' });
      graph.merge({ [node]: node });
    });

    it('should return existing nodes', () => {
      const result = graph.read(node.toString());

      expect(result.meta()).toContain({
        uid: String(node),
      });
    });

    it('should return null for non-existent nodes', () => {
      const result = graph.read('potato');
      expect(result).toBe(null);
    });

  });

  describe('merge', () => {

    let node1, node2, subgraph;

    beforeEach(() => {
      node1 = Node.create();
      node2 = Node.create();

      subgraph = Graph.source({
        [node1]: node1,
        [node2]: node2,
      });
    });

    it('should ensure the subgraph is a Graph instance', () => {
      const { uid } = node1.meta();
      node1.merge({
        value: 'preserved',
      });

      graph.merge({
        [uid]: node1,
      });

      const result = graph.read(uid);
      expect(toObject(result)).toEqual(toObject(node1));
    });

    it('should add all the items in the subgraph', () => {
      graph.merge(subgraph);

      const keys = [...graph].map(([key]) => key);
      expect(keys).toContain(node1.toString());
      expect(keys).toContain(node2.toString());
    });

    it('should assume sub-objects are already formatted', () => {
      node1.merge({ data: 'preserved' });

      graph.merge({
        [node1]: node1.toJSON(),
      });

      const result = graph.read(node1.toString());
      expect(result.value('data')).toBe('preserved');
    });

    it('should add node copies, not originals', () => {
      const { uid } = node1.meta();
      node1.merge({ isNode1: true });

      graph.merge({
        [node1]: node1,
      });

      const copied = graph.read(uid);
      expect(toObject(copied)).toEqual({ isNode1: true });
      expect(copied).toNotBe(node1);
    });

    it('should return the update delta', () => {
      const { update } = graph.merge({
        [node2]: node2,
      });

      const object = toObject(update);
      expect(object).toEqual({
        [node2]: node2,
      });
    });

    it('should emit an `update` delta graph on change', () => {
      const spy = createSpy();
      graph.on('update', spy);

      const { update } = graph.merge({
        [node1]: node1,
      });

      expect(spy).toHaveBeenCalledWith(update);
    });

    it('should return the deferred delta', () => {
      const { uid } = node2.meta();

      graph.merge({ [uid]: node2 });

      const update = new Node({ uid });
      update.merge({ change: true });
      update.meta('change').state = time() + 100;

      const { deferred } = graph.merge({ [uid]: update });

      const node = deferred.read(uid);
      expect(node).toBeA(Node);

      expect(toObject(node)).toEqual({
        change: true,
      });
    });

    it('should emit a `deferred` graph on update', () => {
      const spy = createSpy();
      const update = new Node();
      update.merge({ future: true });
      update.meta().state = time() + 100;

      graph.on('deferred', spy);
      const { deferred } = graph.merge({
        [update]: update,
      });

      expect(spy).toHaveBeenCalledWith(deferred);
    });

    it('should return the history delta', () => {

      const data = new Node({ uid: 'existing' });
      const update = new Node({ uid: 'existing' });
      data.merge({ old: true });
      update.merge({ old: false });

      graph.merge({ [data]: data });
      const { history } = graph.merge({ [update]: update });

      const node = history.read('existing');
      expect(node).toBeA(Node);
      expect(toObject(node)).toEqual({
        old: true,
      });

    });

    it('should emit a `history` graph delta', () => {
      const spy = createSpy();
      graph.on('history', spy);

      const node = new Node({ uid: 'node' });
      const update = new Node({ uid: 'node' });
      graph.merge({ [node]: node });

      const { history } = graph.merge({ [update]: update });
      expect(spy).toHaveBeenCalledWith(history);
    });

  });

});
