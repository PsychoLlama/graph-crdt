'use strict';

const { describe, it, beforeEach } = require('mocha');
const expect = require('expect');
const Node = require('./index');

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

});
