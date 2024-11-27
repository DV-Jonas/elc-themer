import { LOG_UPDATED } from 'src/events';
import { Theme } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';
import { emit } from '@create-figma-plugin/utilities';

const applyTheme = async (theme: Theme) => {
  console.log('applyTheme', figma.currentPage.selection);
  const nodes = figma.currentPage.selection.filter((n) => n.visible);
  // : figma.currentPage.findAll((n) => n.visible);

  const mutableNodes = [...nodes]; // Create a mutable copy of the nodes array

  await metaDataThemer(mutableNodes, theme);
  const log = await variablesThemer(mutableNodes, theme);
  emit(LOG_UPDATED, log);
};

export default applyTheme;
