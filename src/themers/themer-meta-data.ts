import { ErrorWithPayload, flattenNodes, parseCSSGradient } from 'src/util';
import { Theme, ThemeDepth } from '../themes';
import config from 'config';

type Token = {
  shouldTheme: boolean;
  path: string;
  collection: string;
  value?: string;
};

let log: ErrorWithPayload[] = [];

const themer = async (nodes: SceneNode[], theme: Theme, depth: ThemeDepth) => {
  log = [];

  // Filter for visible nodes first
  const nodesWithMetadata = nodes.filter((node) =>
    node.getSharedPluginDataKeys(config.namespace).includes(config.key)
  );

  for (const node of nodesWithMetadata) {
    const tokensAsString = node.getSharedPluginData(
      config.namespace,
      config.key
    );
    const { textDecoration, textTransform, gradientOverlay, icon, component } =
      JSON.parse(tokensAsString);

    if (node.type === 'TEXT') {
      await applyTextStyle(node, theme, textDecoration, textTransform);
    } else if (icon) {
      await applyIconSwap(node, theme, icon);
    } else if (component) {
      await applyComponentSwap(node as InstanceNode, theme, component);
    } else {
      await applyGradientOverlay(node, theme, gradientOverlay);
    }
  }

  return log;
};

const applyTextStyle = async (
  node: SceneNode,
  theme: Theme,
  textDecoration: Token,
  textTransform: Token
) => {
  if (textDecoration?.shouldTheme) {
    await applyTextStyleProperty(node, theme, textDecoration, 'textDecoration');
  }
  if (textTransform?.shouldTheme) {
    await applyTextStyleProperty(node, theme, textTransform, 'textCase');
  }
};

const applyTextStyleProperty = async (
  node: SceneNode,
  theme: Theme,
  token: Token,
  property: 'textDecoration' | 'textCase'
) => {
  try {
    const collection = theme.collections.find(
      (c) => c.name === token.collection
    );
    const collectionValues = collection!.variables!;
    const variable = collectionValues.find((v) => v.name === token.path);
    if (!variable) {
      log.push(
        new ErrorWithPayload(`Variable not found for path: ${token.path}`, {
          node: node,
        })
      );
      return;
    }
    const variableValue = variable!.resolveForConsumer(node).value;

    const fontName = (node as TextNode).fontName as FontName;
    await figma.loadFontAsync(fontName);

    if (property === 'textDecoration') {
      (node as TextNode).textDecoration = variableValue as TextDecoration;
    } else if (property === 'textCase') {
      (node as TextNode).textCase = variableValue as TextCase;
    }
  } catch (error) {
    console.error(`Error applying ${property}:`, error);
  }
};

const applyGradientOverlay = async (
  node: SceneNode,
  theme: Theme,
  token: Token
) => {
  if (!token?.shouldTheme) {
    return;
  }

  const collection = theme.collections.find((c) => c.name === token.collection);
  const collectionValues = collection!.variables!;
  const variable = collectionValues.find((v) => v.name === token.path);
  if (!variable) {
    log.push(
      new ErrorWithPayload(`Variable not found for path: ${token.path}`, {
        node: node,
      })
    );
    return;
  }

  const variableValue = variable!.resolveForConsumer(node).value as string;

  if (variableValue === 'NONE') {
    const existingFills = (node as GeometryMixin).fills;
    if (Array.isArray(existingFills) && existingFills.length > 0) {
      const topFill = existingFills[existingFills.length - 1];
      if (
        topFill.type === 'GRADIENT_LINEAR' ||
        topFill.type === 'GRADIENT_RADIAL'
      ) {
        (node as GeometryMixin).fills = existingFills.slice(0, -1);
      }
    }
    return;
  }

  // Parse the CSS-like gradient string
  const parsedGradient = parseCSSGradient(variableValue);
  if (!parsedGradient) {
    console.error('Failed to parse gradient:', variableValue);
    return;
  }

  const gradientPaint: GradientPaint = {
    type:
      parsedGradient.type === 'radial' ? 'GRADIENT_RADIAL' : 'GRADIENT_LINEAR',
    gradientStops: parsedGradient.colorStops,
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
  };

  // Check if fills is an array and not figma.mixed
  const existingFills = (node as GeometryMixin).fills;

  if (Array.isArray(existingFills)) {
    (node as GeometryMixin).fills = [...existingFills, gradientPaint];
  } else {
    // Handle the case where fills is figma.mixed or another unexpected type
    log.push(
      new ErrorWithPayload(
        `Fills are mixed or not an array, applying gradient as the only fill`,
        {
          node: node,
        }
      )
    );
    (node as GeometryMixin).fills = [gradientPaint];
  }
};

const applyIconSwap = async (node: SceneNode, theme: Theme, token: Token) => {
  // To apply the swap, we need to get the custom component key
  // from the variable stored in the brand library local variables collection
  const collection = theme.collections.find((c) => c.name === token.collection);
  const collectionValues = collection!.variables!;
  const variable = collectionValues.find(
    (v) => v.name === config.iconPath + node.name
  );

  if (!variable) {
    log.push(
      new ErrorWithPayload(
        `Variable not found for path: ${config.iconPath + node.name}`,
        {
          node: node,
        }
      )
    );

    return;
  }

  //// Fetch component from team library
  // First we get the component key from the variable
  const componentKey = variable.resolveForConsumer(node).value;
  // Then we fetch the component set from the team library

  const componentSet = await figma.importComponentSetByKeyAsync(
    componentKey as string
  );
  if (!componentSet) {
    log.push(
      new ErrorWithPayload(
        `Variable not found for path: ${config.iconPath + node.name}`,
        {
          node: node,
        }
      )
    );
    return;
  }
  // Then we find the variant that matches the node's current variant
  const variantProps = (node as InstanceNode).variantProperties;
  const component = (componentSet.children.find((child) => {
    if ('variantProperties' in child) {
      return (
        JSON.stringify(child.variantProperties) === JSON.stringify(variantProps)
      );
    }
    return false;
  }) || componentSet.defaultVariant) as ComponentNode;

  if (!component) {
    log.push(
      new ErrorWithPayload(
        `No matching variant found and no default variant available`,
        {
          node: node,
        }
      )
    );
    return;
  }

  // Then we swap the component
  (node as InstanceNode).swapComponent(component);
};

const applyComponentSwap = async (
  node: InstanceNode,
  theme: Theme,
  token: Token
) => {
  // To apply the swap, we need to get the custom component key
  // from the variable stored in the brand library local variables collection
  let variable: Variable | undefined;
  try {
    const collection = theme.collections.find(
      (c) => c.name === token.collection
    );
    const collectionValues = collection?.variables || [];
    variable = collectionValues.find(
      (v) => v.name === config.componentPath + node.name
    );
  } catch (error) {
    return;
  }

  let componentKey: VariableValue;
  if (variable) {
    componentKey = variable.resolveForConsumer(node).value;
  } else {
    // If there is no variable stored, it means we're trying to swap a component back to the original white label component.
    // The original component key is saved in the description of the custom component.
    const mainComponent = await node.getMainComponentAsync();
    const description =
      mainComponent?.parent?.type === 'COMPONENT_SET'
        ? mainComponent.parent.description
        : mainComponent?.description;

    componentKey = description ? JSON.parse(description).sourceKey : undefined;

    if (!componentKey) {
      console.log(
        `Variable not found for path: ${config.componentPath + node.name}`,
        { node: node }
      );
      return;
    }
  }

  // Then we import the component or componentSet
  let componentSet: ComponentSetNode;
  try {
    componentSet = await figma.importComponentSetByKeyAsync(
      componentKey as string
    );
  } catch (error) {
    log.push(
      new ErrorWithPayload(
        `Incorrect component key: ${config.componentPath + node.name}`,
        { node: node }
      )
    );
    return;
  }

  // Now we make sure we variants match between the original component and the imported component
  const variantProps = (node as InstanceNode).variantProperties;
  const component = (componentSet.children.find((child) => {
    if ('variantProperties' in child) {
      return (
        JSON.stringify(child.variantProperties) === JSON.stringify(variantProps)
      );
    }
    return false;
  }) || componentSet.defaultVariant) as ComponentNode;

  if (!component) {
    log.push(
      new ErrorWithPayload(
        `No matching variant found and no default variant available`,
        { node: node }
      )
    );
    return;
  }

  // Lastly we swap the component
  try {
    (node as InstanceNode).swapComponent(component);
  } catch (error) {
    console.error('Error swapping component:', error);
  }
};

export default themer;
