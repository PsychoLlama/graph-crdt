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

	describe('"uid"', () => {

		let uid;

		beforeEach(() => {
			uid = Node.uid();
		});

		it('should default the length to 24 characters', () => {
			expect(uid.length).toBe(24);
		});

		it('should allow you to override the length', () => {
			uid = Node.uid({ length: 10 });
			expect(uid.length).toBe(10);
		});

		it('should allow you to specify the charset', () => {
			uid = Node.uid({
				charset: 'J',
				length: 2,
			});
			expect(uid).toBe('JJ');
		});

		it('should return an empty string if length < 0', () => {
			uid = Node.uid({
				length: -10,
			});
			expect(uid).toBe('');
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
	const now = new Date();

	beforeEach(() => {
		node = Node.create();
	});

	/* Generic tests */
	it('should not have properties upon creation', () => {
		const keys = node.keys();
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
			const result = node.read('no such key');
			expect(result).toBe(undefined);
		});

		it('should return undefined if called on reserved fields', () => {

			// Please, never do this in your code.
			node.meta().value = 'failure!';

			const result = node.read(node.legend.metadata);
			expect(result).toBe(undefined);
		});

	});

	describe('value update', () => {

		it('should create a new property if none exists', () => {
			node.update('name', 'Joe', now);
			const value = node.read('name');
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
			expect(node.read('data')).toBe('success');
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
				expect(node.read('data')).toBe(false);

				incoming.update('data', true, time());
				node.merge(incoming);

				expect(node.read('data')).toBe(true);
			});

			it('should emit `update` after updates', () => {
				let emitted = false;
				node.on('update', (state) => {
					expect(state.data).toExist();
					emitted = true;
				});

				node.merge({ data: 'yep' });

				expect(emitted).toBe(true);
			});

			it('should not emit `update` without updates', () => {
				let emitted = false;
				node.on('update', () => {
					emitted = true;
				});

				// No properties.
				node.merge({});

				expect(emitted).toBe(false);
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

				expect(node.read('hello')).toBe('World');

			});

			it('should add new properties', () => {
				// Really old state, but it's new to `node`.
				incoming.update('success', true, time() - 100000);

				node.merge(incoming);

				expect(node.read('success')).toBe(true);
			});

			it('should emit `historical` if updates are outdated', () => {
				incoming.update('data', 'old state', time() - 10);
				node.update('data', 'new state', time());

				let emitted = false;
				node.on('historical', (staleUpdates) => {
					expect(staleUpdates.data).toExist();
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
				incoming.update('future', true, time() + 5);
				node.merge(incoming);
				expect(node.read('future')).toNotExist();

				setTimeout(() => {
					expect(node.read('future')).toBe(true);
					done();
				}, 10);
			});

			it('should retry the merge later, not overwrite', (done) => {
				incoming.update('future', true, time() + 10);
				node.merge(incoming);

				// If it's going through `merge`,
				// the update event should fire.
				node.on('update', (state) => {
					expect(state.future).toExist();
					done();
				});
			});

			it('should emit `deferred` when deferred updates come in', () => {
				let emitted = false;
				incoming.update('future', true, time() + 10);

				node.on('deferred', (keys) => {
					expect(keys.future).toExist();
					emitted = true;
				});

				node.merge(incoming);
				expect(emitted).toBe(true);
			});

			it('should not emit `deferred` without deferred updates', () => {
				let emitted = false;
				node.on('deferred', () => {
					emitted = true;
				});

				node.merge({ data: true });
				expect(emitted).toBe(false);
			});

		});

	});

});
