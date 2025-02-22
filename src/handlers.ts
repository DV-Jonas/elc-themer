import { Theme } from './themes';

const onToggleFavorite = (theme: Theme) => {
  if (theme.favorite) {
    figma.clientStorage.setAsync(theme.name, true);
  } else {
    figma.clientStorage.deleteAsync(theme.name);
  }
};

const onSelectNode = async (nodeId: string) => {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node && 'type' in node) {
    figma.currentPage.selection = [node as SceneNode];
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
  } else {
    console.error(`Node with ID ${nodeId} not found or is not a SceneNode.`);
  }
};

export { onToggleFavorite, onSelectNode };
