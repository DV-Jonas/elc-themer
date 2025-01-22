import { LOG_UPDATED } from 'src/events';
import { Theme, ThemeDepth } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';
import { emit } from '@create-figma-plugin/utilities';
import { flattenNodes } from 'src/util';

const applyTheme = async (theme: Theme, depth: ThemeDepth) => {
  const nodes = figma.currentPage.selection.filter((n) => n.visible);
  const flatMutableNodes = flattenNodes([...nodes]);
  const metaLog = await metaDataThemer(flatMutableNodes, theme, depth);
  const variablesLog = await variablesThemer(flatMutableNodes, theme, depth);
  emit(LOG_UPDATED, [...metaLog, ...variablesLog]);
};

export default applyTheme;
