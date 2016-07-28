'use strict';

const { describe, it, beforeEach } = require('mocha');
const Graph = require('./index');
const Node = require('../Node');
const expect = require('expect');

describe('Graph static method', () => {

	describe('"source"', () => {

		it('should use the input as it\'s data source', () => {
			const node = Node.create({ uid: 'member' });
			const graph = Graph.create();
			node.merge({ data: true });
			graph.add(node);

			const copy = Graph.source(graph.toJSON());
			expect(copy.read('member').read('data')).toBe(true);
		});

		it('should source nested POJOs into nodes', () => {
			const node = Node.create().merge({ data: true });
			const copy = JSON.parse(JSON.stringify(node));

			const graph = Graph.source({

				// "copy" is a plain object.
				'placeholder': copy,
			});

			const [key] = graph.keys();
			expect(graph.read(key)).toBeA(Node);
		});

	});

});

describe('A graph', () => {
	let graph;

	beforeEach(() => {
		graph = Graph.create();
	});

	it('should be initialized empty', () => {
		const keys = graph.keys();

		expect(keys.length).toBe(0);
	});

	it('should return the nodes when `toJSON` is called', () => {
		const node = Node.create({ uid: 'unique id' });
		node.merge({ data: 'intact' });
		graph.add(node);

		const string = JSON.stringify(graph);
		expect(string).toContain('unique id');
		expect(string).toContain('intact');
	});

	describe('"add" call', () => {

		let node;

		beforeEach(() => {
			node = Node.create();
		});

		it('should add the node given', () => {
			graph.add(node);
			const { uid } = node.meta();
			const keys = graph.keys();
			expect(keys).toContain(uid);
		});

		it('should emit `add` if it\'s a new node', () => {
			let emitted = false;
			graph.on('add', (addition) => {
				expect(addition).toBe(node);
				emitted = true;
			});

			graph.add(node);
			expect(emitted).toBe(true);
		});

		it('should not emit `add` if the node was already added', () => {

			// Add the node the first time...
			graph.add(node);

			let emitted = false;
			graph.on('add', () => {
				emitted = true;
			});

			// It's already there. Shouldn't fire.
			graph.add(node);

			expect(emitted).toBe(false);
		});

		it('should merge nodes with the same uid', () => {
			graph.add(node);
			const similar = Node.create({ uid: node.toString() });

			// Add a new property.
			similar.merge({ hello: 'world' });

			// Should merge with `node`.
			graph.add(similar);

			expect(node.read('hello')).toBe('world');
		});

		it('should convert objects to nodes', () => {
			graph.add({ hello: 'graph' });

			const [key] = graph.keys();
			expect(graph.read(key)).toBeA(Node);
		});

		it('should return the `this` context', () => {
			const result = graph.add(node);

			expect(result).toBe(graph);
		});

	});

	describe('"raw" call', () => {

		let node;

		beforeEach(() => {
			node = Node.create();
			graph.add(node);
		});

		it('should return existing nodes', () => {
			const result = graph.read(node.toString());

			expect(result).toBe(node);
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

		it('should add all the items in the subgraph', () => {
			graph.merge(subgraph);

			const keys = graph.keys();
			expect(keys).toContain(node1.toString());
			expect(keys).toContain(node2.toString());
		});

		it('should assume sub-objects are already formatted', () => {
			node1.merge({ data: 'preserved' });
			subgraph = {
				[node1]: node1.toJSON(),
			};
			graph.merge(subgraph);

			const result = graph.read(node1.toString());
			expect(result.read('data')).toBe('preserved');
		});

		it('should return the `this` context', () => {
			const result = graph.merge(subgraph);

			expect(result).toBe(graph);
		});

	});

});
