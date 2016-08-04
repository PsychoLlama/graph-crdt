/* eslint-disable require-jsdoc*/
import { describe, it, beforeEach } from 'mocha';
import expect from 'expect';
import { conflict } from './index';
const { createSpy } = expect;

describe.only('A union', () => {

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

		it('should resolve to the greater object uid', () => {
			current.value = { toString: () => 'abc' };
			update.value = { toString: () => 'def' };
			setup();
			expect(result).toBe(update);
			expect(inverse).toBe(update);
		});

		it('should return the first arg if uids are equal', () => {
			current.value = { toString: () => 'equal' };
			update.value = { toString: () => 'equal' };
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(update);
		});

		it('should favor objects over strings', () => {
			current.value = { toString: () => 'def' };
			update.value = 'abc';
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(current);
		});

		it('should favor numbers over strings', () => {
			current.value = '5';
			update.value = 5;
			setup();
			expect(result).toBe(update);
			expect(inverse).toBe(update);
		});

		it('should resolve to larger values', () => {
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

		it('should favor objects over strings of the same signature', () => {
			current.value = { toString: () => 'equal' };
			update.value = 'equal';
			setup();
			expect(result).toBe(current);
			expect(inverse).toBe(current);
		});

		it('should throw an error for invalid json', () => {
			current.value = Infinity;
			update.value = NaN;
			expect(setup).toThrow(/invalid json/i);
		});

	});

});
