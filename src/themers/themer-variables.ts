import { emit } from '@create-figma-plugin/utilities';
import { THEME_PROGRESS } from 'src/events';
import { Theme, ThemeDepth } from '../themes';
import { defer, ErrorWithPayload, withThemeRefresh } from 'src/util';

type VariableConfig = {
  collectionName: string;
  collectionId: string;
  explicitModes: string[] | null;
  path: string;
  variable: Variable;
};

let log: ErrorWithPayload[] = [];
let depth: ThemeDepth;

const themer = async (nodes: SceneNode[], theme: Theme, _depth: ThemeDepth) => {
  log = [];
  depth = _depth;

  await Promise.all(
    nodes.map(async (node) => {
      await processNode(node, theme);
    })
  );

  return log;
};

const processNode = async (node: SceneNode, theme: Theme) => {
  emit(THEME_PROGRESS, node.name);
  await defer(async () => {
    try {
      const layersWithVariables = node.boundVariables;

      if ('componentProperties' in node) {
        await processComponentProperties(node, theme);
      }

      if (layersWithVariables && !layersWithVariables.componentProperties) {
        await processLayersWithVariables(node, layersWithVariables, theme);
      }
    } catch (error) {
      if (error instanceof ErrorWithPayload) {
        log.push(error);
      } else {
        log.push(new ErrorWithPayload('Unknown error', { node: node }));
      }
    }
  });
};

const processLayersWithVariables = async (
  node: SceneNode,
  layersWithVariables: Record<string, any>,
  theme: Theme
) => {
  const promises = Object.entries(layersWithVariables).map(
    async ([propertyName, boundVariables]) => {
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

            // // Theming depth is set to spacing, so we only apply spacing variables
            // if (depth === 'spacing') {
            //   if (!sourceVariableConfig.path.startsWith('spacing/')) {
            //     continue;
            //   }
            // }

            await applyVariable(
              node,
              theme,
              propertyName,
              sourceVariableConfig
            );
          }
        }
      }
    }
  );
  await Promise.all(promises);
};

const processComponentProperties = async (node: InstanceNode, theme: Theme) => {
  const propertiesToUpdate: Record<string, any> = {};

  const promises = Object.entries(node.componentProperties).map(
    async ([propertyName, property]) => {
      if (property.boundVariables && property.boundVariables.value) {
        const variableRef = property.boundVariables.value;
        if (variableRef.type === 'VARIABLE_ALIAS') {
          const config = await createSourceVariableConfig(node, variableRef);
          const collection = theme.collections.find(
            (c) => c.name === config.collectionName
          );
          const variable = collection!.variables?.find(
            (v) => v && v.name === config.path
          );

          const variableAlias = figma.variables.createVariableAlias(variable!);
          propertiesToUpdate[propertyName] = variableAlias;
        }
      }
    }
  );
  await Promise.all(promises);

  if (Object.keys(propertiesToUpdate).length > 0) {
    node.setProperties(propertiesToUpdate);
  }
};

const createSourceVariableConfig = async (
  node: SceneNode,
  variableRef: any
): Promise<VariableConfig> => {
  const variableId = variableRef.id as string;
  const variable = await figma.variables.getVariableByIdAsync(variableId);

  if (!variable) {
    throw new ErrorWithPayload(
      `Variable with id ${variableId} no longer exists`,
      {
        node: node,
      }
    );
  }

  const collectionId = variable.variableCollectionId as string;
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    collectionId
  );

  if (!collection) {
    throw new ErrorWithPayload(
      `Collection with id ${collectionId} no longer exists`,
      {
        node: node,
      }
    );
  }

  const explicitModes = await getModeNames(
    node.explicitVariableModes!,
    variable
  );

  return {
    collectionName: collection.name,
    collectionId: collection.id,
    explicitModes,
    path: variable.name,
    variable: variable,
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
    (v) => v && v.name === sourceConfig.path
  );

  if (!targetVariable) {
    throw new ErrorWithPayload(`Unknown variable: ${sourceConfig.path}`, {
      node: node,
    });
  }

  if (targetVariable.id === sourceConfig.variable.id) {
    return;
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

export default withThemeRefresh(themer);
