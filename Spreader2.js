/**
 * Calculates 3D coordinates for tree nodes using a simple layered/radial approach
 * and transforms the tree into the specified output format.
 */

// Default layout options that can be imported and used or overridden
export const layoutOptions = {
    depthSpacing: 40, // Reduced from 80 to 40 for closer Z separation
    siblingSpreadRadius: 75, // Reduced from 150 to 75 for tighter spacing
    nodeVisualRadius: 30,     // The radius value to assign to each node in the output
    minNodeDistance: 50,      // Reduced from 80 to 50 for closer minimum distance
    radiusGrowthFactor: 1.2   // Reduced from 1.5 to 1.2 for less expansion per depth
};

/**
 * Calculates 3D coordinates for tree nodes using a simple layered/radial approach
 * and transforms the tree into the specified output format.
 */
export function layoutAndTransformTree(originalRootNode, options = {}) {
    if (!originalRootNode) {
        return null;
    }

    // Default configurations for the layout - closer spacing
    const config = {
        depthSpacing: 40,        // Reduced from 80
        siblingSpreadRadius: 75, // Reduced from 150
        nodeVisualRadius: 30,
        minNodeDistance: 50,     // Reduced from 80
        radiusGrowthFactor: 1.2, // Reduced from 1.5
        ...options // User-provided options will override defaults
    };

    const treeCopy = JSON.parse(JSON.stringify(originalRootNode));
    const allNodes = []; // Track all nodes for collision detection
    
    _assignCoordinatesRecursive(treeCopy, 0, 0, 0, config, 0, allNodes); // Root at 0,0,0, depth 0
    return _transformToOutputFormatRecursive(treeCopy, config);
}

/** @private */
function _assignCoordinatesRecursive(node, x, y, z, config, depth, allNodes) {
    if (!node) return;

    node.x = x;
    node.y = y;
    node.z = z;
    node.depth = depth;
    node.radius = config.nodeVisualRadius;

    // Add to tracking list for collision detection
    allNodes.push({
        x: x,
        y: y,
        z: z,
        radius: config.nodeVisualRadius,
        node: node
    });

    if (node.children && node.children.length > 0) {
        const numChildren = node.children.length;
        
        // Calculate radius based on number of children and minimum spacing requirements
        const nodeRadius = config.nodeVisualRadius;
        const minDistance = config.minNodeDistance;
        
        // Calculate minimum radius needed to fit all children without overlap
        // Using circumference = 2πr, and we need at least minDistance * numChildren around the circle
        const minRadiusForSpacing = (minDistance * numChildren) / (2 * Math.PI);
        
        // Base radius increases with depth to spread out the tree
        const baseRadius = config.siblingSpreadRadius * Math.pow(config.radiusGrowthFactor, depth);
        
        // Use the larger of the two radii
        let currentRadius = Math.max(baseRadius, minRadiusForSpacing);
        
        // Reduced safety factor for closer spacing
        currentRadius *= 1.1; // Reduced from 1.2 to 1.1
        
        console.log(`Depth ${depth}, Children: ${numChildren}, Calculated radius: ${currentRadius}`);
        
        // Calculate angle step ensuring even distribution
        const angleStep = (2 * Math.PI) / numChildren;
        
        // Use a deterministic starting angle based on parent position
        const startingAngle = (x + y + z) % (2 * Math.PI);

        const childPositions = [];

        node.children.forEach((child, index) => {
            let attempts = 0;
            let validPosition = false;
            let childX, childY, childZ;

            while (!validPosition && attempts < 10) {
                // Calculate angle with some randomization to avoid perfect alignment
                const baseAngle = startingAngle + (index * angleStep);
                const angleVariation = attempts * 0.05; // Reduced variation for tighter packing
                const angle = baseAngle + angleVariation;
                
                // Calculate position with current radius
                const testRadius = currentRadius + (attempts * minDistance * 0.1); // Reduced growth per attempt
                childX = x + testRadius * Math.cos(angle);
                childY = y + testRadius * Math.sin(angle);
                childZ = z - config.depthSpacing; // Negative Z for "deeper" levels

                // Check for collisions with existing nodes
                validPosition = _checkNoCollision(childX, childY, childZ, nodeRadius, allNodes, config.minNodeDistance);
                
                if (!validPosition) {
                    attempts++;
                    if (attempts === 5) {
                        // If still colliding, increase the radius less aggressively
                        currentRadius *= 1.15; // Reduced from 1.3 to 1.15
                    }
                }
            }

            if (!validPosition) {
                // Fallback: place at a safe distance (but not too far)
                const fallbackAngle = startingAngle + (index * angleStep);
                const fallbackRadius = currentRadius * 1.5; // Reduced from 2.0 to 1.5
                childX = x + fallbackRadius * Math.cos(fallbackAngle);
                childY = y + fallbackRadius * Math.sin(fallbackAngle);
                childZ = z - config.depthSpacing;
                console.warn(`Fallback positioning used for child ${index} at depth ${depth + 1}`);
            }

            childPositions.push({ x: childX, y: childY, z: childZ });
        });

        // Now recursively process children with their final positions
        node.children.forEach((child, index) => {
            const pos = childPositions[index];
            _assignCoordinatesRecursive(child, pos.x, pos.y, pos.z, config, depth + 1, allNodes);
        });
    }
}

/** @private */
function _checkNoCollision(x, y, z, radius, allNodes, minDistance) {
    for (const existingNode of allNodes) {
        const dx = x - existingNode.x;
        const dy = y - existingNode.y;
        const dz = z - existingNode.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Required distance is sum of radii plus minimum spacing
        const requiredDistance = radius + existingNode.radius + minDistance;
        
        if (distance < requiredDistance) {
            return false; // Collision detected
        }
    }
    return true; // No collision
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