import { Theme } from '../themes';
import Log from 'src/log';

type VariableConfig = {
  collectionName: string;
  explicitModes: string[] | null;
  path: string;
  variable: Variable;
};

const themer = async (nodes: SceneNode[], theme: Theme) => {
  for (const node of nodes) {
    try {
      if (node.type === 'INSTANCE' || node.type === 'FRAME') {
        await processInstanceNode(node as InstanceNode, theme);
      } else {
        await processNode(node, theme);
      }
    } catch (error) {
      console.error('Error processing node:', node, error);
    }
  }
};

const processInstanceNode = async (
  instanceNode: InstanceNode,
  theme: Theme
) => {
  try {
    await processNode(instanceNode, theme); // Process the instance node itself

    for (const childNode of instanceNode.children) {
      if (childNode.type === 'INSTANCE' || childNode.type === 'FRAME') {
        await processInstanceNode(childNode as InstanceNode, theme);
      } else {
        const boundVariables = childNode.boundVariables;
        if (boundVariables) {
          await processLayersWithVariables(childNode, boundVariables, theme);
        }
      }
    }
  } catch (error) {
    console.error('Error processing instance node:', instanceNode, error);
  }
};

const processNode = async (node: SceneNode, theme: Theme) => {
  try {
    const layersWithVariables = node.boundVariables;

    if ('componentProperties' in node) {
      await processComponentProperties(node, theme);
    }

    if (layersWithVariables && !layersWithVariables.componentProperties) {
      await processLayersWithVariables(node, layersWithVariables, theme);
    }
  } catch (error) {
    console.error('Error processing node:', node, error);
  }
};

const processLayersWithVariables = async (
  node: SceneNode,
  layersWithVariables: Record<string, any>,
  theme: Theme
) => {
  // For each layer
  for (const [propertyName, boundVariables] of Object.entries(
    layersWithVariables
  )) {
    if (boundVariables) {
      const variableRefs = Array.isArray(boundVariables)
        ? boundVariables
        : [boundVariables];
      for (const variableRef of variableRefs) {
        if (variableRef.type === 'VARIABLE_ALIAS') {
          const sourceVariableConfig = await createSourceVariableConfig(
            node,
            variableRef
          );
          await applyVariable(node, theme, propertyName, sourceVariableConfig);
        }
      }
    }
  }
};

const processComponentProperties = async (node: InstanceNode, theme: Theme) => {
  const propertiesToUpdate: Record<string, any> = {};

  for (const [propertyName, property] of Object.entries(
    node.componentProperties
  )) {
    if (property.boundVariables && property.boundVariables.value) {
      const variableRef = property.boundVariables.value;
      if (variableRef.type === 'VARIABLE_ALIAS') {
        const config = await createSourceVariableConfig(node, variableRef);
        const collection = theme.collections.find(
          (c) => c.name === config.collectionName
        );
        const variable = collection!.variables?.find(
          (v) => v.name === config.path
        );

        const variableAlias = figma.variables.createVariableAlias(variable!);
        propertiesToUpdate[propertyName] = variableAlias;
      }
    }
  }
  if (Object.keys(propertiesToUpdate).length > 0) {
    node.setProperties(propertiesToUpdate);
  }
};

const createSourceVariableConfig = async (
  node: SceneNode,
  variableRef: any
): Promise<VariableConfig> => {
  const variableId = variableRef.id as string;
  const variable = figma.variables.getVariableById(variableId);
  const collectionId = variable?.variableCollectionId as string;
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    collectionId
  );

  const explicitModes = await getModeNames(
    node.explicitVariableModes!,
    variable!
  );

  return {
    collectionName: collection!.name,
    explicitModes,
    path: variable!.name,
    variable: variable!,
  };
};

const applyPaints = (
  node: SceneNode,
  propertyName: 'fills' | 'strokes',
  sourceConfig: VariableConfig,
  targetVariable: Variable
) => {
  const defaultColor = '#000';
  let paint = figma.util.solidPaint(defaultColor);
  paint = figma.variables.setBoundVariableForPaint(
    paint,
    'color',
    targetVariable
  );

  const paints = (node as GeometryMixin)[propertyName] as readonly Paint[];

  (node as GeometryMixin)[propertyName] = paints.map((paintItem: Paint) => {
    if (
      'boundVariables' in paintItem &&
      paintItem.boundVariables?.color?.id === sourceConfig.variable.id
    ) {
      return paint;
    }
    return paintItem;
  }) as readonly Paint[];
};

const applyVariable = async (
  node: SceneNode,
  theme: Theme,
  propertyName: string,
  sourceConfig: VariableConfig
) => {
  const targetCollection = theme.collections.find(
    (c) => c.name === sourceConfig.collectionName
  );
  const targetVariable = targetCollection?.variables?.find(
    (v) => v.name === sourceConfig.path
  );

  if (!targetVariable) {
    Log.append(`Variable not found for path: ${sourceConfig.path}`);
    return; // Exit the function if targetVariable is undefined
  }

  if (propertyName === 'fills' || propertyName === 'strokes') {
    applyPaints(
      node,
      propertyName as 'fills' | 'strokes',
      sourceConfig,
      targetVariable
    );
  } else {
    node.setBoundVariable(
      propertyName as VariableBindableNodeField,
      targetVariable
    );
  }

  // Set the explicit modes when applicable
  if (sourceConfig.explicitModes) {
    for (const explicitMode of sourceConfig.explicitModes) {
      const modeId = targetCollection?.collection.modes?.find(
        (m) => m.name === explicitMode
      )?.modeId;
      try {
        node.setExplicitVariableModeForCollection(
          targetCollection!.collection! as VariableCollection,
          modeId!
        );
      } catch (error) {}
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
