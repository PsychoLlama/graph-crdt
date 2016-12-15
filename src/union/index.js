/**
 * Utilities for deterministically merging node attributes.
 *
 * @private
 * @module graph-crdt/src/union
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
