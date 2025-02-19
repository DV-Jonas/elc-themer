import { LOG_UPDATED } from 'src/events';
import { Theme, ThemeDepth } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';
import { emit } from '@create-figma-plugin/utilities';
import { flattenNodes } from 'src/util';

const applyTheme = async (theme: Theme, depth: ThemeDepth) => {
  let nodes = currentSelection();
  const metaLog = await metaDataThemer(nodes, theme, depth);

  // Reload and filter selection after metaDataThemer as it may swap components
  nodes = currentSelection();

  const variablesLog = await variablesThemer(nodes, theme, depth);
  emit(LOG_UPDATED, [...metaLog, ...variablesLog]);
};

const currentSelection = () => {
  const nodes = figma.currentPage.selection.filter((n) => n.visible);
  return flattenNodes([...nodes]);
};

export default applyTheme;
