/* eslint-disable require-jsdoc*/
'use strict';

const { describe, it, beforeEach } = require('mocha');
const expect = require('expect');
const { createSpy } = expect;
const { conflict } = require('./index');

describe('A union', () => {

	describe('conflict', () => {

		let current, update, result, inverse;
		const state = 10;

		beforeEach(() => {
			current = { state };
			update = { state };
		});

		function setup () {
			// Try it in both orders.
			result = conflict(current, update);
			inverse = conflict(update, current);
		}

		it('should resolve to the greater value', () => {
			current.value = 'def';
			update.value = 'abc';
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(current);
		});

		it('should return the first arg if both are equivalent', () => {
			current.value = 'equal';
			update.value = 'equal';
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(update);
		});

		it('should toString objects to compare', () => {
			const spy = createSpy().andReturn('abc');
			current.value = { toString: spy };
			update.value = { toString: () => 'def' };
			setup();
			expect(result).toBe(update);
			expect(inverse).toBe(update);
			expect(spy).toHaveBeenCalled();
		});

		it('should favor objects over strings', () => {
			current.value = { toString: () => 'equal' };
			update.value = 'equal';
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(current);
		});

	});

});
