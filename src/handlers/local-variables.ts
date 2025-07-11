import { emit } from '@create-figma-plugin/utilities';
import {
  LOCAL_VARIABLES,
  NODES_WITH_VARIABLE,
  ACCENT_STYLING_APPLIED,
} from '../events';
import config from '../../config';

type LocalVariableData = {
  name: string;
  collectionName: string;
  id: string;
};

type NodeWithVariable = {
  id: string;
  name: string;
  type: string;
  properties: string[]; // Properties that use the variable (e.g., 'fills', 'strokes', 'width', etc.)
};

// Track nodes that have been styled with accent
const styledNodeIds = new Set<string>();

// Store original stroke values for each styled node
const originalStrokes = new Map<string, readonly Paint[]>();
const originalStrokeWeights = new Map<string, number>();

const getLocalVariablesHandler = async () => {
  try {
    // Get all local collections
    const allLocalCollections =
      await figma.variables.getLocalVariableCollectionsAsync();

    // Find collections from config but exclude 3.swap
    const targetCollectionNames = config.themeCollections.filter(
      (name) => name !== '3.swap'
    );
    const targetCollections = allLocalCollections.filter((collection) =>
      targetCollectionNames.includes(collection.name as any)
    );

    if (targetCollections.length === 0) {
      emit(LOCAL_VARIABLES, []);
      return;
    }

    // Collect all variables from target collections
    const allVariables: LocalVariableData[] = [];

    for (const collection of targetCollections) {
      // Get all variables in this collection
      const variables = await Promise.all(
        collection.variableIds.map(async (id) => {
          const variable = await figma.variables.getVariableByIdAsync(id);
          return variable;
        })
      );

      // Filter out null variables and add to our list
      variables.forEach((variable) => {
        if (variable) {
          allVariables.push({
            name: variable.name,
            collectionName: collection.name,
            id: variable.id,
          });
        }
      });
    }

    emit(LOCAL_VARIABLES, allVariables);
  } catch (error) {
    console.error('Error fetching local variables:', error);
    emit(LOCAL_VARIABLES, []);
  }
};

const searchNodesWithVariableHandler = async (variableId: string) => {
  try {
    const nodesWithVariable: NodeWithVariable[] = [];

    // Helper function to recursively search through nodes
    const searchNode = (node: BaseNode) => {
      // Check if this node has bound variables
      if ('boundVariables' in node && node.boundVariables) {
        const boundVariables = node.boundVariables;
        const propertiesUsingVariable: string[] = [];

        // Check all properties that might have bound variables
        Object.entries(boundVariables).forEach(
          ([propertyName, variableRefs]) => {
            if (variableRefs) {
              // Handle both single variable refs and arrays of variable refs
              const refs = Array.isArray(variableRefs)
                ? variableRefs
                : [variableRefs];

              refs.forEach((ref) => {
                if (
                  ref &&
                  ref.type === 'VARIABLE_ALIAS' &&
                  ref.id === variableId
                ) {
                  // Only log if it's a stroke property (what we care about)
                  if (propertyName === 'strokes') {
                    console.log(
                      `✅ FOUND: Node "${node.name}" (${node.type}) uses variable for STROKES`
                    );
                  }
                  propertiesUsingVariable.push(propertyName);
                }
              });
            }
          }
        );

        // If this node uses the variable, add it to the results
        if (propertiesUsingVariable.length > 0) {
          nodesWithVariable.push({
            id: node.id,
            name: node.name,
            type: node.type,
            properties: propertiesUsingVariable,
          });
        }
      }

      // Check component properties if it's an instance
      if (node.type === 'INSTANCE' && 'componentProperties' in node) {
        const componentProperties = node.componentProperties;
        const propertiesUsingVariable: string[] = [];

        Object.entries(componentProperties).forEach(
          ([propertyName, property]) => {
            if (property.boundVariables && property.boundVariables.value) {
              const variableRef = property.boundVariables.value;
              if (
                variableRef.type === 'VARIABLE_ALIAS' &&
                variableRef.id === variableId
              ) {
                propertiesUsingVariable.push(
                  `componentProperties.${propertyName}`
                );
              }
            }
          }
        );

        if (propertiesUsingVariable.length > 0) {
          nodesWithVariable.push({
            id: node.id,
            name: node.name,
            type: node.type,
            properties: propertiesUsingVariable,
          });
        }
      }

      // Recursively search children
      if ('children' in node) {
        node.children.forEach(searchNode);
      }
    };

    // Start the search from the current page
    searchNode(figma.currentPage);

    emit(NODES_WITH_VARIABLE, nodesWithVariable);
  } catch (error) {
    console.error('Error searching nodes with variable:', error);
    emit(NODES_WITH_VARIABLE, []);
  }
};

const applyAccentStylingHandler = async (nodeId: string) => {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('type' in node)) {
      console.error(`Node with ID ${nodeId} not found or is not a SceneNode.`);
      return;
    }

    // Only apply to frames or instances with stroke property
    if (
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      'strokes' in node
    ) {
      // Get all local collections
      const allLocalCollections =
        await figma.variables.getLocalVariableCollectionsAsync();

      // Find the 0.presentation collection
      const presentationCollection = allLocalCollections.find(
        (collection) => collection.name === '0.presentation'
      );

      if (!presentationCollection) {
        console.error('0.presentation collection not found');
        return;
      }

      // Find the accent-1 variable
      const variables = await Promise.all(
        presentationCollection.variableIds.map(async (id) => {
          return await figma.variables.getVariableByIdAsync(id);
        })
      );

      const visualizerVariable = variables.find(
        (variable) => variable && variable.name === 'Colors/visualizer'
      );

      if (!visualizerVariable) {
        console.error(
          'Colors/visualizer variable not found in 0.presentation collection'
        );
        return;
      }

      // Store original strokes and stroke weight before applying accent styling
      const currentStrokes = (node as FrameNode | InstanceNode).strokes;
      const currentStrokeWeight = (node as FrameNode | InstanceNode)
        .strokeWeight;
      originalStrokes.set(nodeId, currentStrokes);

      // Only store stroke weight if it's a number (not figma.mixed)
      if (typeof currentStrokeWeight === 'number') {
        originalStrokeWeights.set(nodeId, currentStrokeWeight);
      }

      // Apply visualizer color to stroke
      const defaultColor = '#000';
      let paint = figma.util.solidPaint(defaultColor);
      paint = figma.variables.setBoundVariableForPaint(
        paint,
        'color',
        visualizerVariable
      );

      // Apply the paint to strokes
      (node as FrameNode | InstanceNode).strokes = [paint];

      // Set stroke width to 2px
      (node as FrameNode | InstanceNode).strokeWeight = 2;

      // Track this node as styled
      styledNodeIds.add(nodeId);

      console.log(
        `Applied Colors/visualizer styling to ${node.type.toLowerCase()}: ${
          node.name
        }`
      );
      emit(ACCENT_STYLING_APPLIED, { nodeId, action: 'applied' });
    } else {
      console.log(
        `Node type ${node.type} is not applicable for visualizer styling (must be FRAME or INSTANCE with strokes)`
      );
    }
  } catch (error) {
    console.error('Error applying accent styling:', error);
  }
};

const clearAccentStylingHandler = async (nodeId: string) => {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('type' in node)) {
      console.error(`Node with ID ${nodeId} not found or is not a SceneNode.`);
      return;
    }

    if (
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      'strokes' in node
    ) {
      // Restore original strokes
      const originalStrokeValues = originalStrokes.get(nodeId);
      if (originalStrokeValues !== undefined) {
        (node as FrameNode | InstanceNode).strokes = originalStrokeValues;
        originalStrokes.delete(nodeId);
      } else {
        // Fallback: clear strokes if no original values stored
        (node as FrameNode | InstanceNode).strokes = [];
      }

      // Restore original stroke weight
      const originalStrokeWeight = originalStrokeWeights.get(nodeId);
      if (originalStrokeWeight !== undefined) {
        (node as FrameNode | InstanceNode).strokeWeight = originalStrokeWeight;
        originalStrokeWeights.delete(nodeId);
      }

      // Remove from styled nodes tracking
      styledNodeIds.delete(nodeId);

      console.log(
        `Cleared visualizer styling from ${node.type.toLowerCase()}: ${
          node.name
        }`
      );
      emit(ACCENT_STYLING_APPLIED, { nodeId, action: 'cleared' });
    }
  } catch (error) {
    console.error('Error clearing accent styling:', error);
  }
};

export {
  getLocalVariablesHandler,
  searchNodesWithVariableHandler,
  applyAccentStylingHandler,
  clearAccentStylingHandler,
};
export type { LocalVariableData, NodeWithVariable };
