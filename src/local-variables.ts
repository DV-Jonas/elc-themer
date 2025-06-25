import { Theme } from './themes';

const upsertLocalVariablesSet = async (theme: Theme) => {
  // Initialize a result array to store collections and their variables
  const result = [];

  // Get all local collections
  const allLocalCollections =
    await figma.variables.getLocalVariableCollectionsAsync();

  for (const remoteCollection of theme.collections) {
    // Check if the collection already exists
    let localCollection = allLocalCollections.find(
      (collection) => collection.name === remoteCollection.collection.name
    );

    if (!localCollection) {
      // Create the local collection if it doesn't exist
      localCollection = figma.variables.createVariableCollection(
        remoteCollection.collection.name
      );

      // Add modes to the local collection
      const remoteModes = (
        await figma.variables.getVariableCollectionByIdAsync(
          remoteCollection.variables![0].variableCollectionId
        )
      )?.modes;

      if (localCollection) {
        remoteModes?.forEach((mode) => {
          localCollection!.addMode(mode.name);
        });
      }

      // Remove the default created 'Mode 1'
      if (localCollection) {
        localCollection.modes.forEach((mode) => {
          if (mode.name === 'Mode 1') {
            try {
              localCollection!.removeMode(mode.modeId);
            } catch (error) {
              console.error('Error removing mode:', error);
              console.log('localCollection', localCollection);
            }
          }
        });
      }
    }

    // Get all variables in the local collection
    const localVariables = await Promise.all(
      localCollection.variableIds.map(async (ref) => {
        return await figma.variables.getVariableByIdAsync(ref);
      })
    );

    // Add or update variables in the local collection
    const variables = [];
    for (const remoteVariable of remoteCollection.variables!) {
      let localVariable = localVariables.find(
        (v) => v?.name === remoteVariable.name
      );

      if (!localVariable) {
        // Create the variable if it doesn't exist
        localVariable = figma.variables.createVariable(
          remoteVariable!.name,
          localCollection,
          remoteVariable!.resolvedType
        );
      }

      // Update the value for each mode
      const remoteModes = (
        await figma.variables.getVariableCollectionByIdAsync(
          remoteCollection.variables![0].variableCollectionId
        )
      )?.modes;

      remoteModes?.forEach((remoteMode) => {
        const localMode = localCollection.modes.find(
          (m) => m.name === remoteMode.name
        );
        localVariable.setValueForMode(
          localMode!.modeId,
          remoteVariable.valuesByMode[remoteMode.modeId]
        );
      });

      // Add the local variable to the variables array
      variables.push(localVariable);
    }

    // Add the local collection and its variables to the result
    result.push({
      key: remoteCollection.collection.key,
      name: remoteCollection.collection.name,
      collection: localCollection,
      variables,
    });
  }

  // Return the result array
  return result;
};

export { upsertLocalVariablesSet };
