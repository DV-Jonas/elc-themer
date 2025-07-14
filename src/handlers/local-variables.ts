import { emit } from '@create-figma-plugin/utilities';
import {
  LOCAL_VARIABLES,
  NODES_WITH_VARIABLE,
  ACCENT_STYLING_APPLIED,
  CLEAR_VISUALIZATIONS,
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
  parentComponent?: {
    id: string;
    name: string;
    type: string;
  };
};

// Track nodes that have been styled with accent
const styledNodeIds = new Set<string>();

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

    // Helper function to find outermost parent component (INSTANCE)
    const findParentComponent = (
      node: BaseNode
    ): { id: string; name: string; type: string } | null => {
      let current = node.parent;
      let outermostInstance = null;

      // Walk up the tree and keep track of the outermost INSTANCE
      while (current) {
        if (current.type === 'INSTANCE') {
          outermostInstance = {
            id: current.id,
            name: current.name,
            type: current.type,
          };
        }
        current = current.parent;
      }

      return outermostInstance;
    };

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
                  propertiesUsingVariable.push(propertyName);
                }
              });
            }
          }
        );

        // If this node uses the variable, add it to the results
        if (propertiesUsingVariable.length > 0) {
          let parentComponent = null;

          // If the node itself is an INSTANCE, use it as its own component
          if (node.type === 'INSTANCE') {
            parentComponent = {
              id: node.id,
              name: node.name,
              type: node.type,
            };
          } else {
            // Otherwise, find the nearest parent INSTANCE
            parentComponent = findParentComponent(node);
          }

          nodesWithVariable.push({
            id: node.id,
            name: node.name,
            type: node.type,
            properties: propertiesUsingVariable,
            parentComponent: parentComponent || undefined,
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
          let parentComponent = null;

          // If the node itself is an INSTANCE, use it as its own component
          if (node.type === 'INSTANCE') {
            parentComponent = {
              id: node.id,
              name: node.name,
              type: node.type,
            };
          } else {
            // Otherwise, find the nearest parent INSTANCE
            parentComponent = findParentComponent(node);
          }

          nodesWithVariable.push({
            id: node.id,
            name: node.name,
            type: node.type,
            properties: propertiesUsingVariable,
            parentComponent: parentComponent || undefined,
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

const applyAccentStylingHandler = async (data: {
  nodeId: string;
  properties: string[];
}) => {
  try {
    const { nodeId, properties } = data;
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('type' in node)) {
      console.error(`Node with ID ${nodeId} not found or is not a SceneNode.`);
      return;
    }

    // Check if we can apply stroke or fill visualizers to this node type
    const canApplyStroke =
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      'strokes' in node &&
      properties.includes('strokes');

    const canApplyFill =
      (node.type === 'FRAME' ||
        node.type === 'INSTANCE' ||
        node.type === 'VECTOR' ||
        node.type === 'TEXT' ||
        node.type === 'ELLIPSE' ||
        node.type === 'RECTANGLE' ||
        node.type === 'POLYGON' ||
        node.type === 'STAR') &&
      'fills' in node &&
      properties.includes('fills');

    const canApplyFontSizeVisualizer =
      node.type === 'TEXT' &&
      'fills' in node &&
      properties.includes('fontSize');

    if (canApplyStroke || canApplyFill || canApplyFontSizeVisualizer) {
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

      // Create visualizer color paint
      const defaultColor = '#000';
      let paint = figma.util.solidPaint(defaultColor);
      paint = figma.variables.setBoundVariableForPaint(
        paint,
        'color',
        visualizerVariable
      );

      // Apply visualizer to strokes ONLY if the searched variable is used for stroke properties
      if ('strokes' in node && properties.includes('strokes')) {
        const currentStrokes = (node as FrameNode | InstanceNode).strokes;
        const existingStrokes = Array.from(currentStrokes);
        existingStrokes.push(paint);
        (node as FrameNode | InstanceNode).strokes = existingStrokes;
        // DON'T modify strokeWeight - let visualizer use existing thickness
      }

      // Apply visualizer to fills ONLY if the searched variable is used for fill properties
      if ('fills' in node && properties.includes('fills')) {
        const nodeWithFills = node as any; // Use any type for broader node support
        const currentFills = nodeWithFills.fills;
        if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
          const existingFills = Array.from(currentFills);
          existingFills.push(paint);
          nodeWithFills.fills = existingFills;
        }
      }

      // Apply visualizer to fills if the searched variable is used for fontSize (to highlight text with variable font sizes)
      if ('fills' in node && properties.includes('fontSize')) {
        const nodeWithFills = node as any; // Use any type for broader node support
        const currentFills = nodeWithFills.fills;
        if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
          const existingFills = Array.from(currentFills);
          existingFills.push(paint);
          nodeWithFills.fills = existingFills;
        }
      }

      // Track this node as styled
      styledNodeIds.add(nodeId);

      emit(ACCENT_STYLING_APPLIED, { nodeId, action: 'applied' });
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

    // Check if we can clear visualizers from this node type
    const nodeSupportsStrokes =
      (node.type === 'FRAME' || node.type === 'INSTANCE') && 'strokes' in node;
    const nodeSupportsFills =
      (node.type === 'FRAME' ||
        node.type === 'INSTANCE' ||
        node.type === 'VECTOR' ||
        node.type === 'TEXT' ||
        node.type === 'ELLIPSE' ||
        node.type === 'RECTANGLE' ||
        node.type === 'POLYGON' ||
        node.type === 'STAR') &&
      'fills' in node;

    if (nodeSupportsStrokes || nodeSupportsFills) {
      // Get all local collections to find Colors/visualizer variable
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

      // Find the Colors/visualizer variable
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

      // Remove strokes that are bound to the visualizer variable
      if ('strokes' in node) {
        const currentStrokes = (node as FrameNode | InstanceNode).strokes;
        const filteredStrokes = currentStrokes.filter((stroke) => {
          if (stroke.type === 'SOLID' && stroke.boundVariables?.color) {
            const colorVar = stroke.boundVariables.color;
            const isVisualizerStroke =
              colorVar.type === 'VARIABLE_ALIAS' &&
              colorVar.id === visualizerVariable.id;
            return !isVisualizerStroke;
          }
          return true;
        });

        (node as FrameNode | InstanceNode).strokes = filteredStrokes;
      }

      // Remove fills that are bound to the visualizer variable
      if ('fills' in node) {
        const nodeWithFills = node as any; // Use any type for broader node support
        const currentFills = nodeWithFills.fills;
        if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
          const filteredFills = currentFills.filter((fill) => {
            if (fill.type === 'SOLID' && fill.boundVariables?.color) {
              const colorVar = fill.boundVariables.color;
              const isVisualizerFill =
                colorVar.type === 'VARIABLE_ALIAS' &&
                colorVar.id === visualizerVariable.id;
              return !isVisualizerFill;
            }
            return true;
          });

          nodeWithFills.fills = filteredFills;
        }
      }

      // Remove from styled nodes tracking
      styledNodeIds.delete(nodeId);

      emit(ACCENT_STYLING_APPLIED, { nodeId, action: 'cleared' });
    }
  } catch (error) {
    console.error('Error clearing accent styling:', error);
  }
};

const clearAllVisualizerStylingHandler = async () => {
  try {
    // Get all local collections to find Colors/visualizer variable
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

    // Find the Colors/visualizer variable
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

    const visualizerVariableId = visualizerVariable.id;
    let clearedCount = 0;

    // Helper function to clear visualizer from a node
    const clearVisualizerFromNode = (node: BaseNode) => {
      let nodeModified = false;

      try {
        // Check if the node supports strokes and fills and clear visualizer paints
        const nodeSupportsStrokes =
          (node.type === 'FRAME' || node.type === 'INSTANCE') &&
          'strokes' in node;
        const nodeSupportsFills =
          (node.type === 'FRAME' ||
            node.type === 'INSTANCE' ||
            node.type === 'VECTOR' ||
            node.type === 'TEXT' ||
            node.type === 'ELLIPSE' ||
            node.type === 'RECTANGLE' ||
            node.type === 'POLYGON' ||
            node.type === 'STAR') &&
          'fills' in node;

        if (nodeSupportsStrokes || nodeSupportsFills) {
          // Handle strokes
          if ('strokes' in node) {
            const currentStrokes = (node as FrameNode | InstanceNode).strokes;
            const filteredStrokes = currentStrokes.filter((stroke) => {
              if (stroke.type === 'SOLID' && stroke.boundVariables?.color) {
                const colorVar = stroke.boundVariables.color;
                const isVisualizerStroke =
                  colorVar.type === 'VARIABLE_ALIAS' &&
                  colorVar.id === visualizerVariableId;
                return !isVisualizerStroke;
              }
              return true;
            });

            if (filteredStrokes.length !== currentStrokes.length) {
              (node as FrameNode | InstanceNode).strokes = filteredStrokes;
              nodeModified = true;
            }
          }

          // Handle fills
          if ('fills' in node) {
            const nodeWithFills = node as any; // Use any type for broader node support
            const currentFills = nodeWithFills.fills;
            if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
              const filteredFills = currentFills.filter((fill) => {
                if (fill.type === 'SOLID' && fill.boundVariables?.color) {
                  const colorVar = fill.boundVariables.color;
                  const isVisualizerFill =
                    colorVar.type === 'VARIABLE_ALIAS' &&
                    colorVar.id === visualizerVariableId;
                  return !isVisualizerFill;
                }
                return true;
              });

              if (filteredFills.length !== currentFills.length) {
                nodeWithFills.fills = filteredFills;
                nodeModified = true;
              }
            }
          }
        }

        // Check component properties if it's an instance
        if (node.type === 'INSTANCE' && 'componentProperties' in node) {
          const componentProperties = node.componentProperties;

          Object.entries(componentProperties).forEach(
            ([propertyName, property]) => {
              if (property.boundVariables && property.boundVariables.value) {
                const variableRef = property.boundVariables.value;
                if (
                  variableRef.type === 'VARIABLE_ALIAS' &&
                  variableRef.id === visualizerVariableId
                ) {
                  // Component properties are not cleared
                }
              }
            }
          );
        }

        if (nodeModified) {
          clearedCount++;
          emit(ACCENT_STYLING_APPLIED, { nodeId: node.id, action: 'cleared' });
        }

        // Recursively search children
        if ('children' in node) {
          node.children.forEach(clearVisualizerFromNode);
        }
      } catch (error) {
        console.error(`Error clearing visualizer from node ${node.id}:`, error);
      }
    };

    // Start the search from the current page
    clearVisualizerFromNode(figma.currentPage);

    // Clear all local tracking since we're doing a comprehensive clear
    styledNodeIds.clear();
  } catch (error) {
    console.error('Error clearing all visualizer styling:', error);
  }
};

export {
  getLocalVariablesHandler,
  searchNodesWithVariableHandler,
  applyAccentStylingHandler,
  clearAccentStylingHandler,
  clearAllVisualizerStylingHandler,
};
export type { LocalVariableData, NodeWithVariable };
