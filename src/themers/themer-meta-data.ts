import { fetchTeamComponents, parseCSSGradient } from 'src/util';
import { Theme } from '../themes';
import config from 'config';

type Token = {
  shouldTheme: boolean;
  path: string;
  collection: string;
};

const themer = async (nodes: SceneNode[], theme: Theme) => {
  const nodesWithMetadata = nodes.filter((node) =>
    node.getSharedPluginDataKeys(config.namespace).includes(config.key)
  );

  for (const node of nodesWithMetadata) {
    const tokensAsString = node.getSharedPluginData(
      config.namespace,
      config.key
    );
    const { textDecoration, textTransform, gradientOverlay, icon } =
      JSON.parse(tokensAsString);
    if (node.type === 'TEXT') {
      await applyTextStyle(node, theme, textDecoration, textTransform);
    } else if (node.name.includes('icon-')) {
      // applyIconSwap(node, theme, icon);
    } else {
      await applyGradientOverlay(node, theme, gradientOverlay);
    }
  }
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
    console.warn(
      'Fills are mixed or not an array, applying gradient as the only fill.'
    );
    (node as GeometryMixin).fills = [gradientPaint];
  }
};

const applyIconSwap = async (
  node: SceneNode,
  theme: Theme,
  token: Token,
  teamId: string,
  apiKey: string
) => {
  if (!token?.shouldTheme) {
    return;
  }

  const componentName = node.name;

  try {
    const components = await fetchTeamComponents(teamId, apiKey);
    const componentData = components.find((c: any) => c.name === componentName);

    if (componentData) {
      const componentNode = await figma.importComponentByKeyAsync(
        componentData.key
      );
      const newInstance = componentNode.createInstance();
      newInstance.x = node.x;
      newInstance.y = node.y;
      newInstance.resize(node.width, node.height);
      node.parent?.appendChild(newInstance);
      node.remove();
    } else {
      console.error(
        `Component with name ${componentName} not found in the team library.`
      );
    }
  } catch (error) {
    console.error('Error fetching components:', error);
  }
};

export default themer;
