'use strict';

const { describe, it, beforeEach } = require('mocha');
const expect = require('expect');
const Node = require('./index');
const time = require('../time');

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

			expect(node.prop('name')).toBe('Sam');
			expect(node.prop('birthday')).toBe(date);
		});

		it('should set the state to the current time', () => {
			const now = new Date().getTime();
			const node = Node.from({ name: 'Alvin' });

			expect(node.state('name'))
				.toBeLessThan(now + 5)
				.toBeGreaterThan(now - 5);
		});

	});

});

describe('A node', () => {

	let node;
	const now = new Date();

	beforeEach(() => {
		node = Node.create();
	});

	it('should not have properties upon creation', () => {
		const keys = node.keys();
		expect(keys.length).toBe(0);
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
			node.update('name', 'Steve', now);
			const result = node.meta('name');
			expect(result).toBeAn(Object);
		});

	});

	describe('key lookup', () => {

		it('should exclude the object metadata key', () => {
			const keys = node.keys();
			expect(keys).toNotInclude('@object');
		});

		it('should list all the keys', () => {
			node.update('name', 'Anthony', now);

			const keys = node.keys();
			expect(keys).toInclude(['name']);
		});

	});

	describe('property lookup', () => {

		it('should return undefined if the key cannot be found', () => {
			const result = node.prop('no such key');
			expect(result).toBe(undefined);
		});

	});

	describe('value update', () => {

		it('should create a new property if none exists', () => {
			node.update('name', 'Joe', now);
			const value = node.prop('name');
			expect(value).toBe('Joe');
		});

		it('should return the `this` context', () => {
			const result = node.update('name', 'Tim', now);
			expect(result).toBe(node);
		});

		it('should set the updated state', () => {
			node.update('name', 'Bob', now);

			const state = node.state('name');
			expect(state).toBe(now);
		});

		it('should namespace to avoid conflicts', () => {
			node.update('update', 'not a function', now);
			expect(node.update).toBeA(Function);
		});

	});

	describe('merge', () => {

		it('should return the `this` context', () => {
			const incoming = Node.from({ stuff: true });
			const result = node.merge(incoming);
			expect(result).toBe(node);
		});

		it('should convert POJOs into Nodes', () => {
			node.merge({ data: 'success' });
			expect(node.prop('data')).toBe('success');
		});

		describe('within operating state bounds', () => {

			it('should add all new properties', () => {
				const update = Node.from({ data: true });
				node.merge(update);

				const keys = node.keys();
				expect(keys).toContain('data');
			});

			it('should update existing properties', () => {
				const incoming = Node.from({ data: false });
				node.merge(incoming);
				expect(node.prop('data')).toBe(false);

				incoming.update('data', true, time());
				node.merge(incoming);

				expect(node.prop('data')).toBe(true);
			});

		});

		describe('in historical state', () => {

			let incoming;

			beforeEach(() => {
				incoming = Node.create();
			});

			it('should not more recent properties', () => {
				// Stale update.
				incoming.update('hello', 'Mars', time() - 10);

				// Fresh state.
				node.update('hello', 'World', time());

				node.merge(incoming);

				expect(node.prop('hello')).toBe('World');

			});

			it('should add new properties', () => {
				// Really old state, but it's new to `node`.
				incoming.update('success', true, time() - 100000);

				node.merge(incoming);

				expect(node.prop('success')).toBe(true);
			});

			it('should emit `historical` if updates are outdated', () => {
				incoming.update('data', 'old state', time() - 10);
				node.update('data', 'new state', time());

				let emitted = false;
				node.on('historical', (staleUpdates) => {
					expect(staleUpdates).toBeAn(Object);
					emitted = true;
				});

				node.merge(incoming);

				expect(emitted).toBe(true);
			});

			it('should not emit `historical` without stale updates', () => {

				let emitted = false;
				node.on('historical', () => {
					emitted = true;
				});

				incoming.update('new property', 'yeah', time() - 10);
				node.update('hello', 'Earth', time());

				node.merge(incoming);

				expect(emitted).toBe(false);

			});

		});

	});

});
