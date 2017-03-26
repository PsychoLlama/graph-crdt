/* eslint-env mocha */
import expect, { spyOn, createSpy } from 'expect';
import { toObject } from '../test-helpers';
import Graph from '../Graph';
import Node from '../Node';

describe('Graph static method', () => {
  describe('"source"', () => {
    it('uses the input as it\'s data source', () => {
      const node = Node.create({ uid: 'member' });
      const graph = Graph.create();
      node.merge({ data: true });
      graph.merge({ [node]: node });

      const copy = Graph.source(graph.toJSON());
      expect(copy.value('member').value('data')).toBe(true);
    });

    it('sources nested POJOs into nodes', () => {
      const node = Node.create();
      node.merge({ data: true });
      const copy = JSON.parse(JSON.stringify(node));

      const graph = Graph.source({

        // "copy" is a plain object.
        'placeholder': copy,
      });

      const [key] = [...graph].map(([key]) => key);
      expect(graph.value(key)).toBeA(Node);
    });
  });
});

describe('A graph', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('is initialized empty', () => {
    const keys = [...graph].map(([key]) => key);

    expect(keys.length).toBe(0);
  });

  it('returns the nodes when `toJSON` is called', () => {
    const node = Node.create({ uid: 'unique id' });
    node.merge({ data: 'intact' });
    graph.merge({ [node]: node });

    const string = JSON.stringify(graph);
    expect(string).toContain('unique id');
    expect(string).toContain('intact');
  });

  describe('iterator', () => {
    it('lists all the node indices', () => {
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

    it('returns existing nodes', () => {
      const result = graph.value(node.toString());

      expect(result.meta()).toContain({
        uid: String(node),
      });
    });

    it('returns null for non-existent nodes', () => {
      const result = graph.value('potato');
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

    it('ensures the subgraph is a Graph instance', () => {
      const { uid } = node1.meta();
      node1.merge({
        value: 'preserved',
      });

      graph.merge({
        [uid]: node1,
      });

      const result = graph.value(uid);
      expect(toObject(result)).toEqual(toObject(node1));
    });

    it('adds all the items in the subgraph', () => {
      graph.merge(subgraph);

      const keys = [...graph].map(([key]) => key);
      expect(keys).toContain(node1.toString());
      expect(keys).toContain(node2.toString());
    });

    it('assumes sub-objects are already formatted', () => {
      node1.merge({ data: 'preserved' });

      graph.merge({
        [node1]: node1.toJSON(),
      });

      const result = graph.value(node1.toString());
      expect(result.value('data')).toBe('preserved');
    });

    it('adds node copies, not originals', () => {
      const { uid } = node1.meta();
      node1.merge({ isNode1: true });

      graph.merge({
        [node1]: node1,
      });

      const copied = graph.value(uid);
      expect(toObject(copied)).toEqual({ isNode1: true });
      expect(copied).toNotBe(node1);
    });

    it('returns the update delta', () => {
      const { update } = graph.merge({
        [node2]: node2,
      });

      const object = toObject(update);
      expect(object).toEqual({
        [node2]: node2,
      });
    });

    it('emits an `update` delta graph on change', () => {
      const spy = createSpy();
      graph.on('update', spy);

      const { update } = graph.merge({
        [node1]: node1,
      });

      expect(spy).toHaveBeenCalledWith(update);
    });

    it('returns the history delta', () => {
      const data = new Node({ uid: 'existing' });
      const update = new Node({ uid: 'existing' });
      data.merge({ old: true });
      data.meta('old').state = 1;
      update.merge({ old: false });
      update.meta('old').state = 2;

      graph.merge({ [data]: data });
      const { history } = graph.merge({ [update]: update });

      const node = history.value('existing');
      expect(node).toBeA(Node);
      expect(toObject(node)).toEqual({ old: true });
    });

    it('emits a `history` graph delta', () => {
      const spy = createSpy();
      graph.on('history', spy);

      const node = new Node({ uid: 'node' });
      const update = new Node({ uid: 'node' });
      graph.merge({ [node]: node });

      const { history } = graph.merge({ [update]: update });
      expect(spy).toHaveBeenCalledWith(history);
    });

    it('uses Graph#new to create deltas', () => {
      const spy = spyOn(graph, 'new').andCall(() => {
        const graph = new Graph();
        graph.viaNew = true;

        return graph;
      });

      const { update, history } = graph.merge({});

      expect(update).toContain({ viaNew: true });
      expect(history).toContain({ viaNew: true });

      spy.restore();
    });
  });

  describe('"new" call', () => {
    let node;

    beforeEach(() => {
      node = new Node();
    });

    it('returns a new graph', () => {
      graph.merge({ [node]: node });

      const copy = graph.new();
      expect(copy).toBeA(Graph);

      // Must be a copy.
      expect(copy).toNotBe(graph);
    });
  });
});
