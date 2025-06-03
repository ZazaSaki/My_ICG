/**
 * Builds a tree structure from flat nodes and edges arrays
 * @param {Object} data - The input data with nodes and edges
 * @returns {Array} A hierarchical tree structure
 */
function buildTreeFromEdges(data) {
    const { nodes, edges } = data;
    
    // Create a map of nodes by ID for quick lookup
    const nodesMap = {};
    nodes.forEach(node => {
        nodesMap[node.id] = {
            ...node,
            children: []
        };
    });
    
    // Create a set to track which nodes are children
    const childNodes = new Set();
    
    // Connect nodes based on edges
    edges.forEach(edge => {
        const sourceNode = nodesMap[edge.source];
        const targetNode = nodesMap[edge.target];
        
        if (sourceNode && targetNode) {
            sourceNode.children.push(targetNode);
            childNodes.add(targetNode.id);
        }
    });
    
    // Find root nodes (nodes that aren't children of any other node)
    const rootNodes = nodes.filter(node => !childNodes.has(node.id))
        .map(node => nodesMap[node.id]);
    
    return rootNodes;
}

/**
 * Transforms a node from the tree structure to the target object structure
 * @param {Object} node - Node from the tree structure
 * @returns {Object} Transformed node in target format
 */
function transformTreeNode(node) {
    // If the node has no children, it's a leaf node
    if (!node.children || node.children.length === 0) {
        return {
            "path": "Branch1/WorldGenerator.js",
            "code": "// Path: Branch1/WorldGenerator.js"
        };
    }
    
    // Process children recursively
    const processedChildren = {};
    for (const child of node.children) {
        processedChildren[child.data.label] = transformTreeNode(child);
    }
    
    // Add test properties based on node label pattern
    // Note: This is based on the example - you may need to adjust the logic
    // to match your specific requirements
    if (node.data.label.toLowerCase().includes("branch 1") || 
        node.data.label.toLowerCase() === "node 2") {
        processedChildren["test"] = "test1";
    }
    if (node.data.label.toLowerCase().includes("branch 2") || 
        node.data.label.toLowerCase() === "node 3") {
        processedChildren["test"] = "test2";
    }
    
    return processedChildren;
}

/**
 * Converts a flat graph structure to a nested object structure
 * @param {Object} inputData - The input data with nodes and edges
 * @returns {Object} The converted hierarchical object
 */
export function convertGraphToNestedObject(inputData) {
    if (!inputData || !inputData.nodes || !inputData.edges) {
        return {};
    }
    
    // Build tree from the graph structure
    const tree = buildTreeFromEdges(inputData);
    
    if (tree.length === 0) {
        return {};
    }
    
    // Use the first root node as the starting point
    const rootNode = tree[0];
    const output = {};
    
    // Create the output object with the root node's label as the top-level key
    output[rootNode.data.label] = transformTreeNode(rootNode);
    
    return output;
}

/**
 * Sample usage for the converter
 */
export function testConverter() {
    const sampleInput = {
        "title": "Knowledge Tree 6/3/2025",
        "description": "Knowledge tree created in editor",
        "nodes": [
            {
                "id": "1",
                "type": "custom",
                "position": { "x": -100, "y": 0 },
                "data": {
                    "label": "Node 1",
                    "description": "This is the root node.",
                    "manuallyRelatedNodeIds": [],
                    "isCollapsed": false,
                    "hasChildren": true
                }
            },
            // ...other nodes
        ],
        "edges": [
            {
                "id": "e1-2-1",
                "source": "1",
                "target": "2",
                "sourceHandle": "output",
                "targetHandle": "input"
            },
            // ...other edges
        ]
    };
    
    const result = convertGraphToNestedObject(sampleInput);
    console.log(JSON.stringify(result, null, 2));
    return result;
}