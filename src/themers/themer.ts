import { Theme } from '../themes';
import metaDataThemer from './themer-meta-data';
import variablesThemer from './themer-variables';

const applyTheme = async (theme: Theme) => {
  const nodes =
    figma.currentPage.selection.length > 0
      ? figma.currentPage.selection.flatMap((node) =>
          (node as any).children ? [node, ...(node as any).children] : [node]
        )
      : figma.currentPage.findAll();

  const mutableNodes = [...nodes]; // Create a mutable copy of the nodes array
  await metaDataThemer(mutableNodes, theme);
  await variablesThemer(mutableNodes, theme);
};

export default applyTheme;
