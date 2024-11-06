import { Theme } from '../themes';
import config from 'config';

type TextToken = {
  shouldTheme: boolean;
  path: string;
  collection: string;
};

const themer = (nodes: SceneNode[], theme: Theme) => {
  const nodesWithMetadata = nodes.filter((node) =>
    node.getSharedPluginDataKeys(config.namespace).includes(config.key)
  );

  nodesWithMetadata.forEach(async (node) => {
    const tokensAsString = node.getSharedPluginData(
      config.namespace,
      config.key
    );
    const { textDecoration, textTransform } = JSON.parse(tokensAsString);

    if (node.type === 'TEXT') {
      // When the elc-tokenizer is applied to a text node, it will only apply to that node
      await applyTextStyling(node, theme, textDecoration, textTransform);
    } else if ('children' in node) {
      // When the elc-tokenizer is applied to a group node, it will apply to all text nodes within that group
      node
        .findAll((child) => child.type === 'TEXT')
        .forEach(async (textNode) => {
          await applyTextStyling(
            textNode,
            theme,
            textDecoration,
            textTransform
          );
        });
    }
  });
};

const applyTextStyling = async (
  node: SceneNode,
  theme: Theme,
  textDecoration: TextToken,
  textTransform: TextToken
) => {
  if (textDecoration?.shouldTheme) {
    await applyTextProperty(node, theme, textDecoration, 'textDecoration');
  }
  if (textTransform?.shouldTheme) {
    await applyTextProperty(node, theme, textTransform, 'textCase');
  }
};

const applyTextProperty = async (
  node: SceneNode,
  theme: Theme,
  textToken: TextToken,
  property: 'textDecoration' | 'textCase'
) => {
  try {
    const collection = theme.collections.find(
      (c) => c.name === textToken.collection
    );
    const collectionValues = collection!.variables!;
    const textVariable = collectionValues.find(
      (v) => v.name === textToken.path
    );
    const textValue = textVariable!.resolveForConsumer(node).value;

    const fontName = (node as TextNode).fontName as FontName;
    await figma.loadFontAsync(fontName);

    if (property === 'textDecoration') {
      (node as TextNode).textDecoration = textValue as TextDecoration;
    } else if (property === 'textCase') {
      (node as TextNode).textCase = textValue as TextCase;
    }
  } catch (error) {
    console.error(`Error applying ${property}:`, error);
  }
};

export default themer;
