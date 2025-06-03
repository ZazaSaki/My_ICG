/**
 * Calculates 3D coordinates for tree nodes using a simple layered/radial approach
 * and transforms the tree into the specified output format.
 */

// Default layout options that can be imported and used or overridden
export const layoutOptions = {
    depthSpacing: 50, // Distance between parent/child levels along Z-axis
    siblingSpreadRadius: 120, // Reduced from 300 to 120 for closer spacing
    nodeVisualRadius: 30     // The radius value to assign to each node in the output
};

/**
 * Calculates 3D coordinates for tree nodes using a simple layered/radial approach
 * and transforms the tree into the specified output format.
 */
export function layoutAndTransformTree(originalRootNode, options = {}) {
    if (!originalRootNode) {
        return null;
    }

    // Default configurations for the layout
    const config = {
        depthSpacing: 50,
        siblingSpreadRadius: 120, // Reduced from 300 to 120
        nodeVisualRadius: 30,
        ...options // User-provided options will override defaults
    };

    const treeCopy = JSON.parse(JSON.stringify(originalRootNode));
    _assignCoordinatesRecursive(treeCopy, 0, 0, 0, config, 0); // Root at 0,0,0, depth 0
    return _transformToOutputFormatRecursive(treeCopy, config);
}

/** @private */
function _assignCoordinatesRecursive(node, x, y, z, config, depth) {
    if (!node) return;

    node.x = x;
    node.y = y;
    node.z = z; // Z represents the depth level
    node.depth = depth;

    if (node.children && node.children.length > 0) {
        const numChildren = node.children.length;
        
        // Calculate minimum angle needed to prevent bridge overlap
        // Assume bridge width is roughly 1/4 of node radius, and we want some spacing
        const nodeRadius = config.nodeVisualRadius;
        const bridgeWidth = Math.max(nodeRadius / 4, 8); // Same as in main.js
        const spreadRadius = config.siblingSpreadRadius * (1 + depth * 0.2);
        
        // Calculate minimum angular separation needed to prevent overlap
        // Using arc length = radius * angle, we want bridges to have at least bridgeWidth*2 separation
        const minAngularSeparation = (bridgeWidth * 2.5) / spreadRadius; // 2.5 for extra spacing
        
        // Ensure we have enough angular space for all children
        const requiredTotalAngle = numChildren * minAngularSeparation;
        const availableAngle = 2 * Math.PI;
        
        // If we need more space than available, increase the radius
        let currentRadius = spreadRadius;
        if (requiredTotalAngle > availableAngle) {
            currentRadius = (numChildren * bridgeWidth * 2.5) / (2 * Math.PI);
            console.log(`Increased radius from ${spreadRadius} to ${currentRadius} for ${numChildren} children`);
        }
        
        // Calculate actual angle step (either even distribution or minimum separation)
        const angleStep = Math.max((2 * Math.PI) / numChildren, minAngularSeparation);
        
        // Use a deterministic starting angle based on node position to avoid randomness causing overlap
        const startingAngle = (x + y + z) % (2 * Math.PI);

        node.children.forEach((child, index) => {
            // Calculate angle ensuring even distribution and no overlap
            const angle = startingAngle + (index * angleStep);
            
            // Children are placed in a circle in the XY plane relative to the parent
            const childX = x + currentRadius * Math.cos(angle);
            const childY = y + currentRadius * Math.sin(angle);
            // Children are at the next Z depth level
            const childZ = z - config.depthSpacing; // Negative Z for "deeper" levels

            _assignCoordinatesRecursive(child, childX, childY, childZ, config, depth + 1);
        });
    }
}

/** @private */
function _transformToOutputFormatRecursive(annotatedNode, config) {
    if (!annotatedNode) return null;

    const outputNode = {
        location: {
            x: annotatedNode.x,
            y: annotatedNode.y,
            z: annotatedNode.z
        },
        radius: annotatedNode.radius !== undefined ? annotatedNode.radius : config.nodeVisualRadius,
        connections: []
    };

    const layoutInternalProps = ['x', 'y', 'z', 'depth', 'children'];
    for (const key in annotatedNode) {
        if (annotatedNode.hasOwnProperty(key) && !layoutInternalProps.includes(key)) {
            outputNode[key] = annotatedNode[key];
        }
    }

    if (annotatedNode.children && annotatedNode.children.length > 0) {
        outputNode.connections = annotatedNode.children
            .map(child => _transformToOutputFormatRecursive(child, config))
            .filter(c => c !== null);
    }
    return outputNode;
}

/**
 * Prepares (cleans) the raw input tree data to be compatible with layoutAndTransformTree.
 */
export function prepareTreeForLayout(rawDataArray) {
    if (!Array.isArray(rawDataArray) || rawDataArray.length === 0) {
        console.error("prepareTreeForLayout: Input data must be a non-empty array.");
        return null;
    }
    const rawRootNode = rawDataArray[0]; // Assumes the first element is the root
    return _recursivelyCleanNode(rawRootNode);
}

/** @private */
function _recursivelyCleanNode(rawNode) {
    if (!rawNode) return null;

    const cleanedNode = {
        id: rawNode.id,
        type: rawNode.type,
    };

    if (rawNode.data) {
        if (rawNode.data.label !== undefined) cleanedNode.name = rawNode.data.label;
        if (rawNode.data.description !== undefined) cleanedNode.description = rawNode.data.description;
    }

    cleanedNode.children = [];
    if (rawNode.children && Array.isArray(rawNode.children)) {
        cleanedNode.children = rawNode.children
            .map(child => _recursivelyCleanNode(child))
            .filter(child => child !== null);
    }
    return cleanedNode;
}