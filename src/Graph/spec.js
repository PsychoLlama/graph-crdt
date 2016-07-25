'use strict';

const { describe, it, beforeEach } = require('mocha');
const Graph = require('./index');
const Node = require('../Node');
const expect = require('expect');

describe('A graph', () => {
	let graph;

	beforeEach(() => {
		graph = Graph.create();
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

		it('should return the `this` context', () => {
			const result = graph.add(node);

			expect(result).toBe(graph);
		});

	});

});
