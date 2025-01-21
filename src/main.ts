import { showUI, emit, on } from '@create-figma-plugin/utilities';
import { loadThemesAsync, sortThemes, Theme } from './themes';
import applyTheme from './themers/themer';
import {
  TOGGLE_FAVORITE,
  THEMES,
  APPLY_THEME,
  THEME_APPLIED,
  LOG_UPDATED,
  SELECT_NODE,
} from './events';
import tokens from '../tokens.json';
import {
  onSelectNode,
  onToggleFavorite as onToggleFavoriteHandler,
} from './handlers';

export default async function () {
  let themes = await loadThemesAsync();

  const onToggleFavorite = async (theme: Theme) => {
    // Update cache
    onToggleFavoriteHandler(theme);

    // Find the theme in the array and update and sort (sorting is dependent on theme favorites)
    const index = themes.findIndex((t) => t.name === theme.name);
    if (index !== -1) {
      themes[index] = theme;
    }
    themes = sortThemes(themes);

    emit(THEMES, themes);
  };

  const onApplyTheme = async (themeName: string) => {
    emit(LOG_UPDATED, []);
    // Timeout is needed let the UI update before applying the theme (theme is a blocking call)
    setTimeout(async () => {
      const selectedTheme = themes.find((t) => t.name === themeName);
      await applyTheme(selectedTheme!);
      emit(THEME_APPLIED);
    }, 100);
  };

  showUI({
    height: tokens.plugin.size.height,
    width: tokens.plugin.size.width,
  });

  on(TOGGLE_FAVORITE, onToggleFavorite);
  on(APPLY_THEME, onApplyTheme);
  on(SELECT_NODE, onSelectNode);

  emit(THEMES, themes);
}
