import { showUI, emit, on } from '@create-figma-plugin/utilities';
import { loadThemesAsync, sortThemes, Theme, ThemeDepth } from './themes';
import applyTheme from './themers/themer';
import {
  TOGGLE_FAVORITE,
  THEMES,
  APPLY_THEME,
  THEME_APPLIED,
  LOG_UPDATED,
  SELECT_NODE,
  GET_FILE_NAME,
  GET_LOCAL_VARIABLES,
  SEARCH_NODES_WITH_VARIABLE,
  APPLY_ACCENT_STYLING,
  CLEAR_VISUALIZATIONS,
  ZOOM_TO_COMPONENT,
} from './events';
import tokens from '../tokens.json';
import { onToggleFavoriteHandler } from './handlers/actions';
import { onSelectNodeHandler } from './handlers/selections';
import { getFileNameHandler } from './handlers/file';
import {
  getLocalVariablesHandler,
  searchNodesWithVariableHandler,
  applyAccentStylingHandler,
  clearAllVisualizerStylingHandler,
} from './handlers/local-variables';

export default async function () {
  // let themes = await loadThemesAsync();

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

  const onApplyTheme = async (themeName: string, depth: ThemeDepth) => {
    emit(LOG_UPDATED, []);
    // Timeout is needed let the UI update before applying the theme (theme is a blocking call)
    setTimeout(async () => {
      const selectedTheme = themes.find((t) => t.name === themeName);
      await applyTheme(selectedTheme!, depth);
      emit(THEME_APPLIED);
    }, 100);
  };

  const onZoomToComponent = async (componentId: string) => {
    try {
      const node = await figma.getNodeByIdAsync(componentId);
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        figma.viewport.scrollAndZoomIntoView([node]);
        figma.currentPage.selection = [node as SceneNode];
      }
    } catch (error) {
      console.error('Error zooming to component:', error);
    }
  };

  showUI({
    height: tokens.plugin.size.height,
    width: tokens.plugin.size.width,
  });

  on(TOGGLE_FAVORITE, onToggleFavorite);
  on(APPLY_THEME, onApplyTheme);
  on(SELECT_NODE, onSelectNodeHandler);
  on(GET_FILE_NAME, getFileNameHandler);
  on(GET_LOCAL_VARIABLES, getLocalVariablesHandler);
  on(SEARCH_NODES_WITH_VARIABLE, searchNodesWithVariableHandler);
  on(APPLY_ACCENT_STYLING, applyAccentStylingHandler);
  on(CLEAR_VISUALIZATIONS, clearAllVisualizerStylingHandler);
  on(ZOOM_TO_COMPONENT, onZoomToComponent);

  emit(THEMES, themes);
}
