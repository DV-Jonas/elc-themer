import config from 'config';

type Theme = {
  name: string;
  favorite: boolean;
  collections: {
    name: string;
    key: string;
    collection: VariableCollection;
    variables: Variable[] | null;
    modes?: { modeId: string; name: string }[];
  }[];
};

type ThemeDepth = 'remote' | 'local';

const loadThemesAsync = async () => {
  const libraryCollections =
    await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

  const filteredLibraryCollections = filterCollections(libraryCollections);
  const groupedCollections = await filteredLibraryCollections.reduce(
    async (accPromise, libraryCollection) => {
      const accumulator = await accPromise;
      const { libraryName, name, key } = libraryCollection;

      const libraryVariablesRefs =
        await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          libraryCollection.key
        );

      const variables = await Promise.all(
        libraryVariablesRefs.map(
          async (ref) => await figma.variables.importVariableByKeyAsync(ref.key)
        )
      );

      const variableCollection =
        (await figma.variables.getVariableCollectionByIdAsync(
          variables[0]?.variableCollectionId
        ))!;

      if (!accumulator[libraryName]) {
        const favorite = Boolean(
          await figma.clientStorage.getAsync(libraryName)
        );

        accumulator[libraryName] = {
          name: libraryName,
          collections: [],
          favorite: favorite,
        };
      }

      accumulator[libraryName].collections.push({
        name,
        key,
        collection: variableCollection,
        variables,
      });

      return accumulator;
    },
    Promise.resolve({} as Record<string, Theme>)
  );

  const themes = Object.values(groupedCollections);

  return sortThemes(themes);
};

const sortThemes = (themes: Theme[]) => {
  return themes.sort((a, b) => {
    if (b.favorite !== a.favorite) {
      return b.favorite ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
};

const filterCollections = (themes: LibraryVariableCollection[]) => {
  return themes.filter((theme) =>
    config.themeCollections.includes(theme.name as any)
  );
};

export const refreshThemeByName = async (
  themeName: string
): Promise<Theme | null> => {
  const allThemes = await loadThemesAsync();
  return allThemes.find((t) => t.name === themeName) || null;
};

export { type Theme, type ThemeDepth, loadThemesAsync, sortThemes };
