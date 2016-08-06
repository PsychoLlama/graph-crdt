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
 * NOTE: Only subsets of JSON are supported.
 *
 * @throws {Error} - If an unplanned edge case is reached, debugging
 * information is thrown. Realistically, it should never happen.
 * @param  {field1} field1 - Field metadata for the current state.
 * @param  {field2} field2 - Field metadata for the update.
 * @returns {field1|field2} - The field that wins the conflict.
 */
export function conflict (field1, field2) {
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
	const json = {
		current: JSON.stringify(current),
		update: JSON.stringify(update),
	};

	// Compare values lexicographically.
	if (json.current > json.update) {
		return field1;
	}
	if (json.update > json.current) {
		return field2;
	}

	throw new Error(
`Cannot resolve merge conflict on invalid JSON.

If the data is valid JSON, please open an issue at
https://github.com/PsychoLlama/merge-helper/issues
and include the following debugging information:
typeof current: "${typeof current}"
typeof update: "${typeof update}"

> If the following is sensitive, you can omit it.
json.current: "${json.current}"
json.update: "${json.update}"`
	);
}

/**
 * Render object state given a current time and mutation timeline.
 *
 * @todo rewrite with TDD.
 * @param  {Object} timeline - An object representing historical
 * transformations on a field.
 * @param  {Number} clock - The current computer timestamp.
 * @returns {Object} - The value metadata of the resolved address.
 */
export function state (timeline, clock) {
	const changes = Object.keys(timeline).map(parseFloat);

	let state = 0, deferred = Infinity;
	changes.forEach((update) => {
		if (update <= clock && update > state) {
			state = update;
			return;
		}
		if (update > clock && update < deferred) {
			deferred = update;
			return;
		}
	});

	return {
		update: timeline[state] || null,
		deferred: timeline[deferred] || null,
	};
}
