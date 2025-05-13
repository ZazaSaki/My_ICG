/**
 * Gets the list of children for a specific node in a dictionary
 * @param {Object} dict - The dictionary/object to search in
 * @param {string|Array} nodePath - Either a direct key or array of keys forming a path to the node
 * @returns {Array} - List of children objects with key and value properties
 */
export function getChildrenOfNode(dict, nodePath) {
  // Handle case where nodePath is a string (direct key)
  if (typeof nodePath === 'string') {
    if (dict[nodePath] && typeof dict[nodePath] === 'object') {
      return Object.keys(dict[nodePath]).map(key => ({
        key: key,
        value: dict[nodePath][key]
      }));
    }
    return [];
  }
  
  // Handle case where nodePath is an array (path to nested node)
  if (Array.isArray(nodePath)) {
    let currentNode = dict;
    
    // Navigate to the specified node
    for (const key of nodePath) {
      if (currentNode && typeof currentNode === 'object' && key in currentNode) {
        currentNode = currentNode[key];
      } else {
        // Path doesn't exist in the dictionary
        return [];
      }
    }
    
    // Return children of the found node
    if (currentNode && typeof currentNode === 'object') {
      return Object.keys(currentNode).map(key => ({
        key: key,
        value: currentNode[key]
      }));
    }
  }
  
  return [];
}

/**
 * Gets only the keys of children for a node
 * @param {Object} dict - The dictionary/object to search in
 * @param {string|Array} nodePath - Either a direct key or array of keys forming a path to the node
 * @returns {Array} - List of child keys
 */
export function getChildrenKeysOfNode(dict, nodePath) {
  if (typeof nodePath === 'string') {
    if (dict[nodePath] && typeof dict[nodePath] === 'object') {
      return Object.keys(dict[nodePath]);
    }
    return [];
  }
  
  if (Array.isArray(nodePath)) {
    let currentNode = dict;
    for (const key of nodePath) {
      if (currentNode && typeof currentNode === 'object' && key in currentNode) {
        currentNode = currentNode[key];
      } else {
        return [];
      }
    }
    
    if (currentNode && typeof currentNode === 'object') {
      return Object.keys(currentNode);
    }
  }
  
  return [];
}

/**
 * Checks if a node has children
 * @param {Object} dict - The dictionary/object to search in
 * @param {string|Array} nodePath - Either a direct key or array of keys forming a path to the node
 * @returns {boolean} - True if the node has children, false otherwise
 */
export function hasChildren(dict, nodePath) {
  return getChildrenKeysOfNode(dict, nodePath).length > 0;
}
