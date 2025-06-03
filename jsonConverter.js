const inputJson = [
  {
    "id": "1",
    "type": "custom",
    "position": {
      "x": 277.5,
      "y": -2.5
    },
    "data": {
      "label": "main",
      "description": "This is the root node.",
      "manuallyRelatedNodeIds": [],
      "hasChildren": true
    },
    "children": [
      {
        "id": "node_7",
        "type": "custom",
        "position": {
          "x": 138.1875,
          "y": 91.505859375
        },
        "data": {
          "label": "branch2",
          "description": "Description for node_7",
          "isCollapsed": false,
          "manuallyRelatedNodeIds": [],
          "hasChildren": false // Note: In your example, this has children, but hasChildren is false. I'll trust the children array.
        },
        "children": [ // This node_7 actually has a child, node_10
          {
            "id": "node_10",
            "type": "custom",
            "position": {
              "x": 87.1875,
              "y": 192.505859375
            },
            "data": {
              "label": "node 3", // Will become "node3"
              "description": "Description for node_10",
              "isCollapsed": false,
              "manuallyRelatedNodeIds": [],
              "hasChildren": false
            }
          }
        ]
      },
      {
        "id": "node_6",
        "type": "custom",
        "position": {
          "x": 446.6875,
          "y": 100.505859375
        },
        "data": {
          "label": "branch1",
          "description": "Description for node_6",
          "isCollapsed": false,
          "manuallyRelatedNodeIds": [],
          "hasChildren": true
        },
        "children": [
          {
            "id": "node_8",
            "type": "custom",
            "position": {
              "x": 356.6875,
              "y": 204.005859375
            },
            "data": {
              "label": "node 1", // Will become "node1"
              "description": "Description for node_8",
              "isCollapsed": false,
              "manuallyRelatedNodeIds": [],
              "hasChildren": false
            }
          },
          {
            "id": "node_9",
            "type": "custom",
            "position": {
              "x": 587.1875,
              "y": 202.005859375
            },
            "data": {
              "label": "node 2", // Will become "node2"
              "description": "Description for node_9",
              "isCollapsed": false,
              "manuallyRelatedNodeIds": [],
              "hasChildren": false
            }
          }
        ]
      }
    ]
  }
];

export function convertToWorldStructure(nodes) {
  const worldStructure = {};

  // Helper function to process each node and its children recursively
  function processNode(node) {
    const outputNode = {};
    const originalLabel = node.data.label;

    // Process children if they exist
    if (node.children && node.children.length > 0) {
      node.children.forEach(childNode => {
        const childOriginalLabel = childNode.data.label;
        // Sanitize label: "node 1" -> "node1", "branch1" -> "branch1"
        const childKeyLabel = childOriginalLabel.replace(/\s+/g, '');
        
        outputNode[childKeyLabel] = processNode(childNode); // Recursive call

        // Special handling for "node 2" (which becomes "node2")
        // if (childOriginalLabel === "node 2") {
        //   outputNode[childKeyLabel]["material.h"] = "wood";
        // }
      });
    }
    return outputNode;
  }

  // The input is an array, likely with one root node
  if (nodes && nodes.length > 0) {
    const rootNode = nodes[0];
    const rootLabel = rootNode.data.label.replace(/\s+/g, ''); // Sanitize root label too
    worldStructure[rootLabel] = processNode(rootNode);
  }

  return worldStructure;
}

// const worldStructure = convertToWorldStructure(inputJson);

// console.log('const worldStructure = ' + JSON.stringify(worldStructure, null, 2) + ';');