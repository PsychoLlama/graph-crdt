/**
 * @module graph-crdt.time
 * @private
 */

let last = 0;

/**
 * Get the current timestamp, ensuring it's always
 * greater than the last value it returned.
 *
 * @returns {Number} - The epoch timestamp from `new Date`.
 */
function time () {

	const timestamp = new Date().getTime();

	if (last >= timestamp) {

		/**
		 * If called twice within a millisecond, return
		 * a value incremented by a small amount.
		 */
		last += 0.001;
		return last;
	}

	/** Set the timestamp for the next call. */
	last = timestamp;

	return last;
}

export default time;
