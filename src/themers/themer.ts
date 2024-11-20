import { LOG_UPDATED } from 'src/events';
import { Theme } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';
import { emit } from '@create-figma-plugin/utilities';

const applyTheme = async (theme: Theme) => {
  const nodes =
    figma.currentPage.selection.length > 0
      ? figma.currentPage.selection.flatMap((node) =>
          (node as any).children ? [node, ...(node as any).children] : [node]
        )
      : figma.currentPage.findAll();

  const mutableNodes = [...nodes]; // Create a mutable copy of the nodes array

  await metaDataThemer(mutableNodes, theme);
  const log = await variablesThemer(mutableNodes, theme);
  emit(LOG_UPDATED, log);
};

export default applyTheme;
