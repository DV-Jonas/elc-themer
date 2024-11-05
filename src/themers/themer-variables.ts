import { Theme } from '../themes';

type VariableConfig = {
  collection: string;
  explicitModes: string[] | null;
  path: string;
};

const themer = async (nodes: SceneNode[], theme: Theme) => {
  for (const node of nodes) {
    const boundVariables = node.boundVariables;
    if (!boundVariables) continue;

    for (const [property, boundByNodes] of Object.entries(boundVariables)) {
      if (boundByNodes) {
        const variableRefs = Array.isArray(boundByNodes)
          ? boundByNodes
          : [boundByNodes];
        for (const variableRef of variableRefs) {
          if (variableRef.type === 'VARIABLE_ALIAS') {
            // Get the source variable
            const variableId = variableRef.id as string;
            const variable = figma.variables.getVariableById(variableId);

            // Determine the source collection
            const collectionId = variable?.variableCollectionId as string;
            const collection =
              await figma.variables.getVariableCollectionByIdAsync(
                collectionId
              );

            // Determine the source explicit modes (if any)
            const explicitModes = await getModeNames(
              node.explicitVariableModes!,
              variable!
            );

            // Create the variable pointer
            const config = {
              collection: collection!.name,
              path: variable!.name,
              explicitModes: explicitModes,
            };

            //Apply the variable
            applyVariable(node, property, theme, config);
          }
        }
      }
    }
  }
};

const applyVariable = async (
  node: SceneNode,
  nodeProperty: string,
  theme: Theme,
  config: VariableConfig
) => {
  if (!node.setBoundVariable) return;

  const collection = theme.collections.find(
    (c) => c.name === config.collection
  );
  const variable = collection!.variables?.find((v) => v.name === config.path);

  // Switch any white-label variables with variables from the selected theme
  // Fills and strokes are SolidPaints. A new SolidPaint must be created and applied.
  if (nodeProperty === 'fills' || nodeProperty === 'strokes') {
    const paints = (node as GeometryMixin)[nodeProperty] as SolidPaint[];

    const fill = figma.variables.setBoundVariableForPaint(
      paints[0],
      'color',
      variable!
    );

    if ('fills' in node) {
      node.fills = [fill] as readonly Paint[];
    }
  } else {
    node.setBoundVariable(nodeProperty as VariableBindableNodeField, variable!);
  }

  // Swap properties
  console.log('node', node);

  // Set the explicit modes when applicable
  if (config.explicitModes) {
    for (const explicitMode of config.explicitModes) {
      const modeId = collection?.collection.modes?.find(
        (m) => m.name === explicitMode
      )?.modeId;
      try {
        node.setExplicitVariableModeForCollection(
          collection!.collection! as VariableCollection,
          modeId!
        );
      } catch (error) {
        console.log('Error setting explicit mode', error);
        console.log('args', node, nodeProperty);
      }
    }
  }
};

// TODO: Create a lookup table for the modes
const getModeNames = async (
  explicitModes: Record<string, string>,
  variable: Variable
): Promise<string[] | null> => {
  if (Object.keys(explicitModes).length === 0) {
    return null; // Return null if explicitModes is empty
  }

  const variableCollection =
    await figma.variables.getVariableCollectionByIdAsync(
      variable.variableCollectionId
    );
  const allModes = variableCollection?.modes;

  if (!allModes) {
    return null; // Return null if no modes are found
  }

  // Map mode IDs from explicitModes to their names and ensure uniqueness
  const modeNamesSet = new Set<string>(
    Object.values(explicitModes)
      .map((modeId) => {
        const mode = allModes.find((m) => m.modeId === modeId);
        return mode ? mode.name : '';
      })
      .filter((name) => name !== '') // Filter out empty strings
  );

  if (modeNamesSet.size === 0) {
    return null; // Return null if the set is empty
  }

  return Array.from(modeNamesSet); // Return an array of mode names
};

export default themer;
