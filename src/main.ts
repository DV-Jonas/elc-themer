import { showUI, emit, on } from '@create-figma-plugin/utilities';
import { loadThemesAsync, Theme } from './themes';
import applyTheme from './themers/themer';
import { TOGGLE_FAVORITE, THEMES, APPLY_THEME } from './events';
import tokens from '../tokens.json';
import { handleToggleFavorite } from './handlers';

export default async function () {
  let themes = await loadThemesAsync();

  const onToggleFavorite = async (theme: Theme) => {
    handleToggleFavorite(theme);
    themes = await loadThemesAsync();
    emit(THEMES, themes);
  };

  const onApplyTheme = async (themeName: string) => {
    const selectedTheme = themes.find((t) => t.name === themeName);
    applyTheme(selectedTheme!);
  };

  showUI({
    height: tokens.plugin.size.height,
    width: tokens.plugin.size.width,
  });

  emit(THEMES, themes);

  on(TOGGLE_FAVORITE, onToggleFavorite);
  on(APPLY_THEME, onApplyTheme);
}
