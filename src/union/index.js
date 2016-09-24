/**
 * Utilities for deterministically merging node attributes.
 *
 * @private
 * @module graph-datastore/src/union
 */

/**
 * Deterministically resolves merge conflicts
 * on JSON-compatible data.
 *
 * @param  {Object} field1 - Current state field metadata.
 * @param  {Object} field2 - Update field metadata.
 * @returns {Object} - The greater value, or if they're
 * equal, the current state.
 */
export function conflict (field1, field2) {

	/** Turn the values into comparable strings. */
	const string = {
		current: JSON.stringify(field1.value),
		update: JSON.stringify(field2.value),
	};

	/** Are the values equal? */
	const equal = (string.current === string.update);

	/** Is our current value greater? */
	const greater = (string.current > string.update);

	/** Return the winning value. */
	return (equal || greater) ? field1 : field2;
}

/**
 * Render object state given a current time and mutation timeline.
 *
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
