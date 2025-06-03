const assert = require('assert');
const { convertJsonStructure } = require('../jsonConverter'); // Corrected path

describe('convert function', () => {
    it('should convert input correctly', () => {
        assert.strictEqual(convert('input'), 'expectedOutput');
    });

    it('should handle edge cases', () => {
        assert.strictEqual(convert('edgeCaseInput'), 'expectedEdgeCaseOutput');
    });

    it('should return an error for invalid input', () => {
        assert.throws(() => convert('invalidInput'), Error);
    });
});

describe('convertJsonStructure function', () => {
    it('should convert the example input correctly', () => {
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

        const expectedOutput = {
            "layer 1": {
                "branch 1": {
                    "level 1": {
                        "path": "Branch1/WorldGenerator.js",
                        "code": "// Path: Branch1/WorldGenerator.js"
                    },
                    "level 2": {
                        "path": "Branch1/WorldGenerator.js",
                        "code": "// Path: Branch1/WorldGenerator.js"
                    },
                    "test": "test1"
                },
                "branch 2": {
                    "level 1": {
                        "path": "Branch1/WorldGenerator.js",
                        "code": "// Path: Branch1/WorldGenerator.js"
                    },
                    "test": "test2"
                }
            }
        };
        assert.deepStrictEqual(convertJsonStructure(exampleInput), expectedOutput);
    });

    it('should return an empty object for null input', () => {
        assert.deepStrictEqual(convertJsonStructure(null), {});
    });

    it('should return an empty object for an empty array input', () => {
        assert.deepStrictEqual(convertJsonStructure([]), {});
    });
});