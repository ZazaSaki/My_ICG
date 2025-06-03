import { getChildrenOfNode, hasChildren } from './nodeUtils.js';
import { convertToWorldStructure } from './jsonConverter.js';
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
    let children = 0;
    for (const key in dict) {
        if (typeof dict[key] === 'object' && dict[key] !== null) {
            children++;
        }
    }

    for (const key in dict) {
        if (typeof dict[key] === 'object' && dict[key] !== null) {
            // number of connected bridges
            const connections = getChildrenOfNode(dict, key).length;

            const local_angle_start = angle_start + (angle_peace * connections_itetration)
            const local_angle_end = local_angle_start + angle_peace
            
            // platform size definition
            const raio = (platform_radius(connections) + (info.start_location ? 0 : 1)) * scale;
            
            const distance = minimal_hight/Math.sin(Math.abs(z_angele)) * scale;

            const Bridge_vector  = polarToCartesian3D(
                Math.PI/2 - z_angele,
                local_angle_start,
                distance
            );

            console.log("angle information : ", key)
            console.log({
                "name": key,
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

export function generateWorldStructureFromData() {
    const worldStructure = convertToWorldStructure(exampleInput);
    localStorage.setItem("worldStructure", JSON.stringify(worldStructure));
    const result = iterateDictionary(worldStructure);
    console.log("input structure:", worldStructure);
    return result;
}