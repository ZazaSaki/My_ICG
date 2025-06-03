import { getChildrenOfNode, hasChildren } from './nodeUtils.js';
import { convertToWorldStructure } from './jsonConverter.js';
import { layoutAndTransformTree, prepareTreeForLayout, layoutOptions as spreaderDefaultOptions } from './Spreader2.js';

const worldTestFiles = {"layer 1" : {
    "branch 1" : {
        "level 1" : {
            "path" : "Branch1/WorldGenerator.js",
            "code" : "// Path: Branch1/WorldGenerator.js"
        },
        "level 2" : {
            "path" : "Branch1/WorldGenerator.js",
            "code" : "// Path: Branch1/WorldGenerator.js"
        },
            "test" : "test1"
        },
        "branch 2" : {
            "level 1" : {
                "path" : "Branch1/WorldGenerator.js",
                "code" : "// Path: Branch1/WorldGenerator.js"
            },
                "test" : "test2"
            }
        }
}


const bridge_width_default = 5;
const error_margin_default = 0.05;

const scale = 5;

const minimal_hight = 3;

function platform_radius(connections_number, bridge_width = bridge_width_default, error_margin=error_margin_default){
    if (connections_number < 6){
        return 6 * bridge_width / (2 * Math.PI);
    }
    return connections_number * bridge_width * (1+error_margin)/ (2 * Math.PI);
}

export function d(dict, nodePath){

}

function polarToCartesian3D(angle1, angle2, radius) {
    const x = radius * Math.sin(angle1) * Math.cos(angle2);
    const y = radius * Math.sin(angle1) * Math.sin(angle2);
    const z = radius * Math.cos(angle1);

    // console.log({
    //     angle1: angle1,
    //     angle2: angle2,
    //     radius: radius,
    //     x: x,
    //     y: y,
    //     z: z
    // });
    return { x, y, z };
}

function polarToCartesian2D(angle, radius) {
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y, z : 0};
}

function dtr(degrees) {
    return degrees * (Math.PI / 180);
}

function addVectors(vector1, vector2) {
    return {
        x: vector1.x + vector2.x,
        y: vector1.y + vector2.y,
        z: vector1.z + vector2.z
    };
}

function getChildrenCount(dict) {
    if (!(dict === 'object')) {
        return 0;
    }
    let children = 0;
    for (const key in dict) {
        if (typeof dict[key] === 'object' && dict[key] !== null) {
            children++;
        }
    }
    return children;
}


export function iterateDictionary(
        dict,
        info = {
            "restriction": (dtr(0),dtr(360)) , 
            "start_location": true, 
            "parent": null, 
            "angle_fraction": 1, 
            "angle_start": dtr(0),
            "angle_end": dtr(360),
            "z_angele": 0,
            "parent_radius": 0,
            "parent_location": {x : 0,y : 0,z : 0},
            "parent_key": null,
        }
    ) {
    
    let connections_itetration = 0;
    let angle_start = info.angle_start;
    let angle_peace = (info.angle_end-info.angle_start)/info.angle_fraction;
    
    console.log({
        angle_start,
        angle_end: info.angle_end,
        angle_fraction: info.angle_fraction,
        angle_peace,
        info
    });
    
    const z_angele = info.z_angele == 0 ? 10 : info.z_angele;

    // console.log({"info" : info})
    
    const childrenList = [];
    const children = getChildrenCount(dict);

    for (const key in dict) {
        if (typeof dict[key] === 'object' && dict[key] !== null) {
            // number of connected bridges
            const connections = getChildrenOfNode(dict, key).length;

            const local_angle_start = angle_start + (angle_peace * connections_itetration)
            const local_angle_end = local_angle_start + angle_peace
            
            // platform size definition
            const raio = (platform_radius(connections) + (info.start_location ? 0 : 1)) * scale;
            
            // minimal between parent and child base od hight
            const distance = (minimal_hight/Math.sin(Math.abs(z_angele)) * scale);


            const Bridge_vector  = polarToCartesian3D(
                Math.PI/2 - z_angele,
                local_angle_start,
                distance
            );

            console.log("angle information : ", key)
            console.log({
                "Calculating values name": key,
                angle_start,
                local_angle_start,
                local_angle_end,
                angle_peace,
                z_angele,
                connections,
                raio,
                distance,
                local_angle_start,
                local_angle_end,
                "fraction" :info.angle_fraction,
            });
            // console.log("Bridge_vector",Bridge_vector);

            const Conner_island_vector = polarToCartesian2D(
                local_angle_start,
                info.parent_radius
            );
            // console.log({ Conner_island_vector });

            const Conner_island_vector_local = polarToCartesian2D(
                local_angle_start,
                raio
            );
            // console.log({ Conner_island_vector_local });

            const deslocation_vector = addVectors(Bridge_vector,addVectors(Conner_island_vector,Conner_island_vector_local));

            const final_location = addVectors(info.parent_location, deslocation_vector);
            
            // console.log({"info of the island" : {
                // "location": final_location,
                // "radius": raio,
                // "connections": childrenList
                // }})
            
            childrenList.push(iterateDictionary(
                dict[key],  
                {
                    "restriction": [dtr(0),dtr(360-1)] , 
                    "start_location": false, 
                    "parent": dict[key], 
                    "angle_fraction": info.angle_fraction + connections - 1, 
                    "angle_start": local_angle_start,
                    "angle_end": local_angle_end,
                    "z_angele": info.z_angele,
                    "parent_radius": raio,
                    "parent_location": final_location,
                    "parent_key": key,
                }
            ))
        }
        
        connections_itetration++;
    }
    return {
        "location": info.parent_location,
        "radius": info.parent_radius,
        "connections": childrenList,
        "name": info.parent_key,
        }
}

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

// Converting from data type
const exampleInput = [
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
            "x": 200.1875,
            "y": 99.505859375
          },
          "data": {
            "label": "branch2",
            "description": "Description for node_7",
            "isCollapsed": false,
            "manuallyRelatedNodeIds": [],
            "hasChildren": true
          },
          "children": [
            {
              "id": "node_10",
              "type": "custom",
              "position": {
                "x": 87.1875,
                "y": 192.505859375
              },
              "data": {
                "label": "node 3",
                "description": "Description for node_10",
                "isCollapsed": false,
                "manuallyRelatedNodeIds": [],
                "hasChildren": true
              },
              "children": [
                {
                  "id": "node_11",
                  "type": "custom",
                  "position": {
                    "x": 197.6875,
                    "y": 320.505859375
                  },
                  "data": {
                    "label": "New Node 11",
                    "description": "Description for node_11",
                    "isCollapsed": false,
                    "manuallyRelatedNodeIds": [],
                    "hasChildren": false
                  }
                },
                {
                  "id": "node_12",
                  "type": "custom",
                  "position": {
                    "x": -21.3125,
                    "y": 291.505859375
                  },
                  "data": {
                    "label": "New Node 12",
                    "description": "Description for node_12",
                    "isCollapsed": false,
                    "manuallyRelatedNodeIds": [],
                    "hasChildren": false
                  }
                }
              ]
            },
            {
              "id": "node_13",
              "type": "custom",
              "position": {
                "x": 301.17421875,
                "y": 195.005859375
              },
              "data": {
                "label": "New Node 13",
                "description": "Description for node_13",
                "isCollapsed": false,
                "manuallyRelatedNodeIds": [],
                "hasChildren": false
              },
              "children": [
                {
                  "id": "node_14",
                  "type": "custom",
                  "position": {
                    "x": 404.17421875,
                    "y": 322.005859375
                  },
                  "data": {
                    "label": "New Node 14",
                    "description": "Description for node_14",
                    "isCollapsed": false,
                    "manuallyRelatedNodeIds": [],
                    "hasChildren": false
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "node_6",
          "type": "custom",
          "position": {
            "x": 567.6875,
            "y": 90.005859375
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
                "x": 473.6875,
                "y": 185.505859375
              },
              "data": {
                "label": "node 1",
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
                "x": 688.67421875,
                "y": 193.505859375
              },
              "data": {
                "label": "node 2",
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
  ]

export function generateWorldStructureFromData() {
    const worldStructure = convertToWorldStructure(exampleInput);
    localStorage.setItem("worldStructure", JSON.stringify(worldStructure));
    const result = iterateDictionary(worldStructure);
    console.log("input structure:", worldStructure);
    return result;
}

export function cleanDataTest() {
    const structure = generateWorldStructureFromData();
    return structure;
}

// --- NEW SYSTEM ENTRY POINT using Spreader2.js ---
/**
 * Generates world data using the Spreader2.js layout algorithm.
 * @param {Array<object>} [rawData=exampleInput] - The raw tree data. Defaults to internal exampleInput.
 * @param {object} [customOptions] - Optional layout options to override defaults from Spreader2.js.
 * @returns {object|null} The structured tree with 3D layout data, or null on failure.
 */
export function generateFromDefaultFormat(rawData = exampleInput, customOptions) {
    console.log("Spreader2 System: Received rawData for layout:", rawData);
    const cleanData = prepareTreeForLayout(rawData);

    if (!cleanData) {
        console.error("Spreader2 System: Failed to clean data for layout.");
        return null;
    }
    localStorage.setItem("cleanDataForSpreader", JSON.stringify(cleanData));
    console.log("Spreader2 System: Cleaned data for layoutAndTransformTree:", cleanData);

    // Use provided customOptions, or spreaderDefaultOptions imported from Spreader2.js, or empty object for Spreader2's internal defaults
    const optionsToUse = customOptions || spreaderDefaultOptions || {};
    console.log("Spreader2 System: Using layout options:", optionsToUse);

    const result = layoutAndTransformTree(cleanData, optionsToUse);

    console.log("Spreader2 System: Layout result:", result);
    return result;
}