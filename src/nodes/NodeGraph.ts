import { Node } from "./Node";

/**
 * Class for controlling a node graph
 *
 * @category Nodes
 */
export class NodeGraph {
    /**
     * Root node
     */
    root: Node | null = null;

    /**
     * Sets a node as the root of the graph
     *
     * @param node
     */
    setRootNode(node: Node) {
        this.root = node;
        return this;
    }

    /**
     * Traverses the graph (DFS) and calls a function per node
     *
     * @param fn - function to call for each node
     * @param node - node to start on
     * @param visited - list of visited nodes
     * @param traverseDisabled - Whether to traverse disabled nodes
     */
    traverse(
        fn: (node: Node) => void,
        node?: Node,
        visited: string[] = [],
        traverseDisabled?: boolean
    ) {
        if (!node) {
            if (this.root) {
                node = this.root;
            } else return;
        }

        if (visited.includes(node.id) || (!traverseDisabled && !node.enabled))
            return;
        visited.push(node.id);

        for (let key in node.inputs) {
            let input = node.inputs[key];
            input.from &&
                this.traverse(fn, input.from, visited, traverseDisabled);
        }

        fn(node);
    }
}
