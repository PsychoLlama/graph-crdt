import Graph from './Graph';
import Node from './Node';

export { Graph, Node };

if (typeof window !== 'undefined') {
	Object.assign(window, { Graph, Node });
}
