import { Theme } from './themes';

const handleToggleFavorite = (theme: Theme) => {
  if (theme.favorite) {
    figma.clientStorage.setAsync(theme.name, true);
  } else {
    figma.clientStorage.deleteAsync(theme.name);
  }
};

const handleApplyTheme = (theme: Theme) => {
  // save the theme to the local storage
};

export { handleToggleFavorite, handleApplyTheme };
