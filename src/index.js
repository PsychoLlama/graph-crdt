'use strict';

const Graph = require('./Graph');
const Node = require('./Node');

const result = module.exports = { Graph, Node };

result.default = result;

if (typeof window !== 'undefined') {
	Object.assign(window, result);
}
