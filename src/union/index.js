'use strict';

/**
 * Deterministic merge algorithm.
 *
 * @private
 * @module graph-datastore/src/union
 */

// NOTE: Any changes to the behavior of this file may have
// disastrous consequences. This file ensures eventual consistency
// across machines.

/**
 * Determine whether a value is a type of object.
 *
 * @param  {Mixed} value - The value to test.
 * @returns {Boolean} - Whether it's a type of object.
 */
function isObject (value) {

	return value instanceof Object;
}

/**
 * Deterministically resolves merge conflicts.
 *
 * @throws {Error} - If an unplanned edge case is reached, debugging
 * information is thrown. Realistically, it should never happen.
 * @param  {field1} field1 - Field metadata for the current state.
 * @param  {field2} field2 - Field metadata for the update.
 * @returns {field1|field2} - The field that wins the conflict.
 */
function conflict (field1, field2) {
	const { value: current } = field1;
	const { value: update } = field2;

	// It doesn't matter if they're both the same.
	if (current === update) {
		return field1;
	}

	// Check to see if they're both object types.
	if (isObject(current) && isObject(update)) {

		// NOTE: uid coercion requires object types
		// to use the `toString` interface.
		const uid = {
			current: String(current),
			update: String(update),
		};

		// Compare objects by their uids.
		if (uid.current > uid.update) {
			return field1;
		}
		if (uid.update > uid.current) {
			return field2;
		}

		// Both uids are the same, so it shouldn't
		// matter which we choose.
		return field1;
	}

	// If one is an object, favor it over the primitive.
	if (isObject(current)) {
		return field1;
	}
	if (isObject(update)) {
		return field2;
	}

	// Neither is an object. Compare the string value.
	const string = {
		current: JSON.stringify(current),
		update: JSON.stringify(update),
	};

	// Compare values lexicographically.
	if (string.current > string.update) {
		return field1;
	}
	if (string.update > string.current) {
		return field2;
	}

	// Both strings are equivalent. Compare types.
	const type = {
		current: typeof current,
		update: typeof update,
	};

	// Favor the string (case reached by "5" vs 5).
	if (type.current === 'string') {
		return field1;
	}
	if (type.update === 'string') {
		return field2;
	}

	throw new Error(
`There's an edge case in the conflict resolution.
A lot has been invested to make sure this never happens.
Please open an issue at
https://github.com/PsychoLlama/merge-helper/issues
and include the following debugging information:
typeof current: "${type.current}"
typeof update: "${type.update}"
> If the data below is sensitive, you can omit it.
string.current: "${string.current}"
string.update: "${string.update}"`
	);
}

module.exports = { conflict };
