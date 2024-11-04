type Theme = {
  name: string;
  favorite: boolean;
  collections: { name: string; key: string }[];
};

const loadThemesAsync = async () => {
  const collections =
    await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

  const groupedCollections = await collections.reduce(
    async (accPromise, collection) => {
      const accumulator = await accPromise;
      const { libraryName, name, key } = collection;

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

      accumulator[libraryName].collections.push({ name, key });

      return accumulator;
    },
    Promise.resolve({} as Record<string, Theme>)
  );

  const themes = Object.values(groupedCollections);

  return themes.sort((a, b) => {
    if (b.favorite !== a.favorite) {
      return b.favorite ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
};

export { type Theme, loadThemesAsync };
