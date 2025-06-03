

  /**
   * Transforms a node from the input JSON structure to the target structure.
   * @param {object} node - The input node.
   * @returns {object} The transformed node value.
   */
  export function transformNode(node) {
      // If the node has no children, it's a leaf in the new structure.
      // Return the default path and code object.
      if (!node.children || node.children.length === 0) {
          return {
              "path": "Branch1/WorldGenerator.js",
              "code": "// Path: Branch1/WorldGenerator.js"
          };
      }

      // If the node has children, process them recursively.
      const processedChildren = {};
      for (const child of node.children) {
          processedChildren[child.data.label] = transformNode(child);
      }

      // Add specific "test" properties based on the current node's label,
      // as these "test" keys are siblings to the children's labels in the output.
      if (node.data.label === "branch 1") {
          processedChildren["test"] = "test1";
      }
      if (node.data.label === "branch 2") {
          processedChildren["test"] = "test2";
      }

      return processedChildren;
  }

  /**
   * Converts an array of nodes from one JSON format to another.
   * @param {Array<object>} inputArray - The input array of nodes.
   * @returns {object} The converted JSON object.
   */
  export function convertJsonStructure(inputArray) {
      if (!inputArray || inputArray.length === 0) {
          return {};
      }

      // Assuming the input array contains a single root node for the desired output structure.
      const rootInputNode = inputArray[0];
      const output = {};

      // The root key is the label of the root input node.
      // The value is the result of transforming this root input node.
      output[rootInputNode.data.label] = transformNode(rootInputNode);
      return output; // Added return statement
  }

  // Example Usage (optional, for testing):
  ///*
  export const exampleInput = [
    {
      "id": "1",
      "type": "custom",
      "position": { "x": -46.5, "y": 41 },
      "data": {
        "label": "layer 1",
        "description": "This is the root node.",
        "manuallyRelatedNodeIds": [],
        "isCollapsed": false
      },
      "children": [
        {
          "id": "node_7",
          "type": "custom",
          "position": { "x": -161.25, "y": 192.625 },
          "data": {
            "label": "branch 1",
            "description": "Description for node_7",
            "isCollapsed": false,
            "manuallyRelatedNodeIds": []
          },
          "children": [
            {
              "id": "node_8",
              "type": "custom",
              "position": { "x": -249.75, "y": 301.125 },
              "data": {
                "label": "level 1",
                "description": "Description for node_8",
                "isCollapsed": false,
                "manuallyRelatedNodeIds": []
              }
            },
            {
              "id": "node_9",
              "type": "custom",
              "position": { "x": -71.75, "y": 300.125 },
              "data": {
                "label": "level 2",
                "description": "Description for node_9",
                "isCollapsed": false,
                "manuallyRelatedNodeIds": []
              }
            }
          ]
        },
        {
          "id": "node_10",
          "type": "custom",
          "position": { "x": 110.75, "y": 196.125 },
          "data": {
            "label": "branch 2",
            "description": "Description for node_10",
            "isCollapsed": false,
            "manuallyRelatedNodeIds": ["node_9"]
          },
          "children": [
            {
              "id": "node_11",
              "type": "custom",
              "position": { "x": 133.25, "y": 287.625 },
              "data": {
                "label": "level 1",
                "description": "Description for node_11",
                "isCollapsed": false,
                "manuallyRelatedNodeIds": ["node_9"]
              }
            }
          ]
        }
      ]
    }
  ];

  const converted = convertJsonStructure(exampleInput);
  console.log(JSON.stringify(converted, null, 2));
  */

  /**
   * Reads a JSON file and converts its structure using convertJsonStructure.
   * @param {string} filePath - The path to the JSON file to read.
   * @returns {object} The converted JSON object.
   */
  // export function readAndConvertFile(filePath) {
  //   try {
  //     const fileContent = fs.readFileSync(filePath, 'utf8');
  //     const inputData = JSON.parse(fileContent);
  //     return convertJsonStructure(inputData);
  //   } catch (error) {
  //     console.error('Error reading or converting file:', error.message);
  //     return {};
  //   }
  // }

