import { Node } from "./Node";

export class NodeGraph {
    /**
     * List of nodes in the graph
     */
    nodes: { [key: string]: Node } = {};

    /**
     * Root node
     */
    root: Node | null = null;

    /**
     * Adds a new node to the graph
     *
     * @param node
     */
    addNode(node: Node) {
        this.nodes[node.id] = node;
        return this;
    }

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
     */
    traverse(fn: (node: Node) => void, node?: Node, visited: string[] = []) {
        if (!node) {
            if (this.root) {
                node = this.root;
            } else return;
        }

        if (visited.includes(node.id)) return;
        visited.push(node.id);

        for (let key in node.inputs) {
            let input = node.inputs[key];
            input.from && this.traverse(fn, input.from, visited);
        }

        fn(node);
    }
}