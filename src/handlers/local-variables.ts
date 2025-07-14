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

// Helper function to get the visualizer variable
const getVisualizerVariable = async (): Promise<Variable | null> => {
  try {
    // Get all local collections
    const allLocalCollections =
      await figma.variables.getLocalVariableCollectionsAsync();

    // Find the 0.presentation collection
    const presentationCollection = allLocalCollections.find(
      (collection) => collection.name === '0.presentation'
    );

    if (!presentationCollection) {
      console.error('0.presentation collection not found');
      return null;
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
      return null;
    }

    return visualizerVariable;
  } catch (error) {
    console.error('Error getting visualizer variable:', error);
    return null;
  }
};

// Helper function to check if node supports visualization
const nodeSupportsVisualization = (node: BaseNode): boolean => {
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

  return nodeSupportsStrokes || nodeSupportsFills;
};

// Helper function to clear visualizer paints from a single node
const clearVisualizerFromSingleNode = (
  node: BaseNode,
  visualizerVariableId: string
): boolean => {
  let nodeModified = false;

  try {
    if (!nodeSupportsVisualization(node)) {
      return false;
    }

    // Remove strokes that are bound to the visualizer variable
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

    // Clear spacing visualizations for FRAME nodes
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNode;

      // Reset stroke align to default (it gets set to INSIDE for padding visualization)
      if (frameNode.strokes.length === 0) {
        frameNode.strokeAlign = 'CENTER'; // Reset to default
        nodeModified = true;
      }

      // Remove gap visualization rectangles from parent
      const parent = frameNode.parent;
      if (parent && 'children' in parent) {
        const gapVizElements = parent.children.filter(
          (child) => child.name === 'GAP_VIZ'
        );

        gapVizElements.forEach((element) => {
          element.remove();
        });

        if (gapVizElements.length > 0) {
          nodeModified = true;
        }
      }
    }

    return nodeModified;
  } catch (error) {
    console.error(`Error clearing visualizer from node ${node.id}:`, error);
    return false;
  }
};

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
      // Skip hidden nodes
      if ('visible' in node && !node.visible) {
        return;
      }

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

    const canApplyTypographyVisualizer =
      node.type === 'TEXT' &&
      'fills' in node &&
      (properties.includes('fontSize') ||
        properties.includes('fontWeight') ||
        properties.includes('fontStyle'));

    const canApplySpacingVisualizer =
      node.type === 'FRAME' &&
      (properties.includes('paddingTop') ||
        properties.includes('paddingRight') ||
        properties.includes('paddingLeft') ||
        properties.includes('paddingBottom') ||
        properties.includes('itemSpacing'));

    const canApplyBorderRadiusVisualizer =
      (node.type === 'FRAME' ||
        node.type === 'RECTANGLE' ||
        node.type === 'INSTANCE') &&
      (properties.includes('cornerRadius') ||
        properties.includes('topLeftRadius') ||
        properties.includes('topRightRadius') ||
        properties.includes('bottomLeftRadius') ||
        properties.includes('bottomRightRadius'));

    if (
      canApplyStroke ||
      canApplyFill ||
      canApplyTypographyVisualizer ||
      canApplySpacingVisualizer ||
      canApplyBorderRadiusVisualizer
    ) {
      const visualizerVariable = await getVisualizerVariable();
      if (!visualizerVariable) {
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

      // Apply visualizer to fills if the searched variable is used for fontSize, fontWeight, or fontStyle (to highlight text with variable typography)
      if (
        'fills' in node &&
        (properties.includes('fontSize') ||
          properties.includes('fontWeight') ||
          properties.includes('fontStyle'))
      ) {
        const nodeWithFills = node as any; // Use any type for broader node support
        const currentFills = nodeWithFills.fills;
        if (currentFills !== figma.mixed && Array.isArray(currentFills)) {
          const existingFills = Array.from(currentFills);
          existingFills.push(paint);
          nodeWithFills.fills = existingFills;
        }
      }

      // Apply spacing visualizer if the searched variable is used for spacing properties
      if (
        node.type === 'FRAME' &&
        (properties.includes('paddingTop') ||
          properties.includes('paddingRight') ||
          properties.includes('paddingLeft') ||
          properties.includes('paddingBottom') ||
          properties.includes('itemSpacing'))
      ) {
        const frameNode = node as FrameNode;

        // Visualize padding with inside stroke
        const hasPaddingProps = properties.some((p) =>
          [
            'paddingTop',
            'paddingRight',
            'paddingLeft',
            'paddingBottom',
          ].includes(p)
        );
        if (hasPaddingProps) {
          const maxPadding = Math.max(
            frameNode.paddingTop,
            frameNode.paddingBottom,
            frameNode.paddingLeft,
            frameNode.paddingRight
          );

          if (maxPadding > 0) {
            // Create blue stroke for padding visualization
            let paddingPaint = figma.util.solidPaint('#0000FF'); // Blue
            paddingPaint = figma.variables.setBoundVariableForPaint(
              paddingPaint,
              'color',
              visualizerVariable
            );

            const currentStrokes = frameNode.strokes;
            const existingStrokes = Array.from(currentStrokes);
            existingStrokes.push(paddingPaint);
            frameNode.strokes = existingStrokes;
            frameNode.strokeWeight = maxPadding;
            frameNode.strokeAlign = 'INSIDE';
          }
        }

        // Visualize gaps with absolutely positioned rectangles
        if (
          properties.includes('itemSpacing') &&
          frameNode.layoutMode !== 'NONE' &&
          frameNode.itemSpacing > 0 &&
          frameNode.children.length > 1
        ) {
          const gapValue = frameNode.itemSpacing;
          const visibleChildren = frameNode.children.filter(
            (child) => child.visible
          );

          for (let i = 0; i < visibleChildren.length - 1; i++) {
            const gapRect = figma.createRectangle();
            gapRect.name = 'GAP_VIZ';

            // Create red semi-transparent fill
            const gapPaint: SolidPaint = {
              type: 'SOLID',
              color: { r: 1, g: 0, b: 0 }, // Red
              opacity: 0.5,
              boundVariables: {
                color: { type: 'VARIABLE_ALIAS', id: visualizerVariable.id },
              },
            };
            gapRect.fills = [gapPaint];

            // Position absolutely - add to parent, not to the frame
            const parent = frameNode.parent;
            if (parent && 'appendChild' in parent) {
              parent.appendChild(gapRect);

              // Calculate position based on layout direction
              const child1 = visibleChildren[i];
              const child2 = visibleChildren[i + 1];

              if (frameNode.layoutMode === 'HORIZONTAL') {
                // Full height, positioned between children
                gapRect.resize(
                  Math.max(gapValue, 2),
                  frameNode.height -
                    frameNode.paddingTop -
                    frameNode.paddingBottom
                );
                gapRect.x = frameNode.x + child1.x + child1.width;
                gapRect.y = frameNode.y + frameNode.paddingTop;
              } else if (frameNode.layoutMode === 'VERTICAL') {
                // Full width, positioned between children
                gapRect.resize(
                  frameNode.width -
                    frameNode.paddingLeft -
                    frameNode.paddingRight,
                  Math.max(gapValue, 2)
                );
                gapRect.x = frameNode.x + frameNode.paddingLeft;
                gapRect.y = frameNode.y + child1.y + child1.height;
              }
            }
          }
        }
      }

      // Apply border radius visualizer if the searched variable is used for border radius properties
      if (
        (node.type === 'FRAME' ||
          node.type === 'RECTANGLE' ||
          node.type === 'INSTANCE') &&
        (properties.includes('cornerRadius') ||
          properties.includes('topLeftRadius') ||
          properties.includes('topRightRadius') ||
          properties.includes('bottomLeftRadius') ||
          properties.includes('bottomRightRadius'))
      ) {
        const nodeWithRadius = node as any; // Use any type for broader node support

        // Create orange stroke for border radius visualization
        let radiusPaint = figma.util.solidPaint('#FF6B35'); // Orange
        radiusPaint = figma.variables.setBoundVariableForPaint(
          radiusPaint,
          'color',
          visualizerVariable
        );

        if ('strokes' in nodeWithRadius) {
          const currentStrokes = nodeWithRadius.strokes;
          const existingStrokes = Array.from(currentStrokes);
          existingStrokes.push(radiusPaint);
          nodeWithRadius.strokes = existingStrokes;

          // Set stroke weight if not already set
          if (nodeWithRadius.strokeWeight === 0) {
            nodeWithRadius.strokeWeight = 2;
          }
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

const clearAllVisualizerStylingHandler = async () => {
  try {
    const visualizerVariable = await getVisualizerVariable();
    if (!visualizerVariable) {
      return;
    }

    let clearedCount = 0;

    // Helper function to recursively clear visualizer from nodes
    const clearVisualizerFromNode = (node: BaseNode) => {
      // Skip hidden nodes
      if ('visible' in node && !node.visible) {
        return;
      }

      const nodeModified = clearVisualizerFromSingleNode(
        node,
        visualizerVariable.id
      );

      if (nodeModified) {
        clearedCount++;
        emit(ACCENT_STYLING_APPLIED, { nodeId: node.id, action: 'cleared' });
      }

      // Recursively search children
      if ('children' in node) {
        node.children.forEach(clearVisualizerFromNode);
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
  clearAllVisualizerStylingHandler,
};
export type { LocalVariableData, NodeWithVariable };
