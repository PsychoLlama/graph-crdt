/**
 * Turns an entries iterable into an object.
 * @private
 * @param  {Mixed} iterable - Anything with a Symbol.iterator.
 * @return {Object} - Iterated entry entries spread onto a new object.
 */
export const toObject = (iterable) => {
  const entries = [...iterable];

  return entries.reduce((object, [key, value]) => {
    const copy = Object.assign({
      [key]: value,
    }, object);

    return copy;
  }, {});
};
