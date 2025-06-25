import { LOG_UPDATED } from 'src/events';
import { Theme, ThemeDepth } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';
import { emit } from '@create-figma-plugin/utilities';
import { flattenNodes } from 'src/util';
import { upsertLocalVariablesSet } from 'src/local-variables';

const applyTheme = async (theme: Theme, depth: ThemeDepth) => {
  let clonedTheme = theme; // Use a new variable to hold the theme being applied

  if (depth === 'local') {
    // Clone the theme to avoid modifying the original object
    clonedTheme = { ...theme };

    // Upsert the local variables
    const collections = await upsertLocalVariablesSet(clonedTheme);

    clonedTheme.collections = collections;
  }

  let nodes = currentSelection();

  // Pass the potentially cloned theme to the themer
  const metaLog = await metaDataThemer(nodes, clonedTheme, depth);

  // Reload and filter selection after metaDataThemer as it may swap components (the existing selection will not hold the recently swapped components)
  nodes = currentSelection();

  // Pass the potentially cloned theme to the themer
  const variablesLog = await variablesThemer(nodes, clonedTheme, depth);
  emit(LOG_UPDATED, [...metaLog, ...variablesLog]);
};

const currentSelection = () => {
  const nodes = figma.currentPage.selection.filter((n) => n.visible);
  return flattenNodes([...nodes]);
};

export default applyTheme;
