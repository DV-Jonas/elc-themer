import { Theme } from '../themes';

const onToggleFavoriteHandler = (theme: Theme) => {
  if (theme.favorite) {
    figma.clientStorage.setAsync(theme.name, true);
  } else {
    figma.clientStorage.deleteAsync(theme.name);
  }
};

export { onToggleFavoriteHandler };
