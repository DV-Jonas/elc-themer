import {
  TextboxAutocomplete,
  TextboxAutocompleteOption,
  useInitialFocus,
} from 'node_modules/@create-figma-plugin/ui/lib';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import {
  GET_LOCAL_VARIABLES,
  LOCAL_VARIABLES,
  SEARCH_NODES_WITH_VARIABLE,
  NODES_WITH_VARIABLE,
  APPLY_ACCENT_STYLING,
  CLEAR_ACCENT_STYLING,
  ACCENT_STYLING_APPLIED,
} from '../events';
import type {
  LocalVariableData,
  NodeWithVariable,
} from '../handlers/local-variables';
import Button from '../components/button';

type GroupedVariables = {
  [header: string]: LocalVariableData[];
};

const ThemeVisualizer = () => {
  const [value, setValue] = useState<string>('');
  const [options, setOptions] = useState<Array<TextboxAutocompleteOption>>([]);
  const [selectedVariable, setSelectedVariable] =
    useState<LocalVariableData | null>(null);
  const [nodesWithVariable, setNodesWithVariable] = useState<
    NodeWithVariable[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [variableMap, setVariableMap] = useState<
    Map<string, LocalVariableData>
  >(new Map());
  const [styledNodes, setStyledNodes] = useState<Set<string>>(new Set());
  const [hasAppliedStyling, setHasAppliedStyling] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const transformVariablesToOptions = (
    variables: LocalVariableData[]
  ): Array<TextboxAutocompleteOption> => {
    const options: Array<TextboxAutocompleteOption> = [];
    const newVariableMap = new Map<string, LocalVariableData>();

    // Group variables by their category (first part of name)
    const grouped: GroupedVariables = {};

    variables.forEach((variable) => {
      // Parse variable name like "color/primary/500" or "font/family/body"
      const parts = variable.name.split('/');
      if (parts.length >= 2) {
        const category = parts[0]; // "color", "font", etc.
        const subcategory = parts[1]; // "primary", "family", etc.
        const value = parts.slice(2).join('/'); // "500" or remaining parts

        if (!grouped[category]) {
          grouped[category] = [];
        }

        // Create formatted option value: "category-subcategory: value"
        const optionValue = value
          ? `${category}-${subcategory}: ${value}`
          : `${category}-${subcategory}`;

        grouped[category].push({
          name: optionValue,
          collectionName: variable.collectionName,
          id: variable.id,
        });

        // Store variable data in the map
        newVariableMap.set(optionValue, variable);
      }
    });

    // Sort categories to ensure consistent order
    const sortedCategories = Object.keys(grouped).sort();

    // Build options with headers
    sortedCategories.forEach((category, index) => {
      // Add separator before each category except the first
      if (index > 0) {
        options.push('-');
      }

      // Add header (capitalize first letter)
      const header = category.charAt(0).toUpperCase() + category.slice(1);
      options.push({
        header: header,
      });

      // Add variables for this category
      const categoryVariables = grouped[category];

      // Sort variables within category
      categoryVariables.sort((a, b) => a.name.localeCompare(b.name));

      categoryVariables.forEach((variable) => {
        options.push({
          value: variable.name,
        });
      });
    });

    // Update the variable map state
    setVariableMap(newVariableMap);

    return options;
  };

  useEffect(() => {
    // Listen for local variables data
    const unsubscribeVariables = on(
      LOCAL_VARIABLES,
      (variableData: LocalVariableData[]) => {
        const transformedOptions = transformVariablesToOptions(variableData);
        setOptions(transformedOptions);
      }
    );

    // Listen for nodes with variable data
    const unsubscribeNodes = on(
      NODES_WITH_VARIABLE,
      (nodes: NodeWithVariable[]) => {
        setNodesWithVariable(nodes);
        setIsSearching(false);
        setHasSearched(true);

        console.log(`Found ${nodes.length} nodes using variable`);

        // Apply styling to all applicable nodes
        const applicableNodes = nodes.filter(canApplyVisualizer);
        console.log(
          `Found ${applicableNodes.length} applicable nodes for styling`
        );

        // Only log applicable nodes
        nodes.forEach((node) => {
          const isApplicable = canApplyVisualizer(node);
          if (isApplicable) {
            console.log(
              `✅ APPLICABLE: ${node.name} (${
                node.type
              }) - Properties: [${node.properties.join(', ')}]`
            );
          }
        });

        applicableNodes.forEach((node) => {
          console.log(`Applying styling to: ${node.name} (${node.type})`);
          emit(APPLY_ACCENT_STYLING, node.id);
        });

        // Don't set hasAppliedStyling here - let the ACCENT_STYLING_APPLIED events handle it
        console.log(
          applicableNodes.length > 0
            ? `Will style ${applicableNodes.length} applicable nodes`
            : 'No applicable nodes found'
        );
      }
    );

    // Listen for accent styling events
    const unsubscribeAccent = on(
      ACCENT_STYLING_APPLIED,
      (data: { nodeId: string; action: 'applied' | 'cleared' }) => {
        console.log(
          `ACCENT_STYLING_APPLIED event: ${data.action} for node ${data.nodeId}`
        );

        setStyledNodes((prev) => {
          const newSet = new Set(prev);
          console.log(
            `Before update - styledNodes size: ${
              prev.size
            }, nodes: [${Array.from(prev).join(', ')}]`
          );

          if (data.action === 'applied') {
            newSet.add(data.nodeId);
            console.log(`Added node ${data.nodeId} to styled nodes`);
          } else {
            newSet.delete(data.nodeId);
            console.log(`Removed node ${data.nodeId} from styled nodes`);
          }

          console.log(
            `After update - styledNodes size: ${
              newSet.size
            }, nodes: [${Array.from(newSet).join(', ')}]`
          );
          return newSet;
        });
      }
    );

    // Request local variables data
    emit(GET_LOCAL_VARIABLES);

    // Cleanup listeners on unmount
    return () => {
      unsubscribeVariables();
      unsubscribeNodes();
      unsubscribeAccent();
    };
  }, []);

  // Update hasAppliedStyling whenever styledNodes changes
  useEffect(() => {
    const hasStyledNodes = styledNodes.size > 0;
    console.log(
      `useEffect triggered: styledNodes size = ${styledNodes.size}, setting hasAppliedStyling to ${hasStyledNodes}`
    );
    console.log(
      `styledNodes contents: [${Array.from(styledNodes).join(', ')}]`
    );
    setHasAppliedStyling(hasStyledNodes);
  }, [styledNodes]);

  function onInput(event: Event & { currentTarget: HTMLInputElement }) {
    const newValue = event.currentTarget.value;
    setValue(newValue);

    // Find the selected variable data from the map
    const variable = variableMap.get(newValue);
    if (variable) {
      setSelectedVariable(variable);
    } else {
      setSelectedVariable(null);
    }

    // Reset styling state when changing variable
    setStyledNodes(new Set());
    setNodesWithVariable([]);
    setIsSearching(false);
    setHasSearched(false);
  }

  const onApply = () => {
    console.log(
      `onApply clicked - hasAppliedStyling: ${hasAppliedStyling}, selectedVariable: ${
        selectedVariable?.name || 'none'
      }`
    );

    if (hasAppliedStyling) {
      // Clear all applied styling
      console.log(`Clearing styling for ${styledNodes.size} nodes`);
      styledNodes.forEach((nodeId) => {
        console.log(`Emitting CLEAR_ACCENT_STYLING for node: ${nodeId}`);
        emit(CLEAR_ACCENT_STYLING, nodeId);
      });
    } else if (selectedVariable) {
      console.log(
        `Applying styling - searching for nodes using variable: ${selectedVariable.name}`
      );
      setIsSearching(true);
      setNodesWithVariable([]);
      setHasSearched(false);
      emit(SEARCH_NODES_WITH_VARIABLE, selectedVariable.id);
      console.log('Searching for nodes using variable:', selectedVariable);
    }
  };

  const isDisabled = (!value || !selectedVariable) && !hasAppliedStyling;

  // Debug: Log state changes
  console.log('UI State:', {
    hasAppliedStyling,
    styledNodesCount: styledNodes.size,
    buttonText: hasAppliedStyling ? 'Clear' : 'Apply',
    buttonVariant: hasAppliedStyling ? 'error' : 'primary',
    isDisabled,
    selectedVariable: selectedVariable?.name || 'none',
    value,
  });

  const canApplyVisualizer = (node: NodeWithVariable) => {
    return (
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      node.properties.includes('strokes')
    );
  };

  const isNodeStyled = (nodeId: string) => {
    return styledNodes.has(nodeId);
  };

  return (
    <div class='p-4 space-y-4'>
      <div class='flex flex-row gap-2 w-full'>
        <div class='flex-1'>
          <TextboxAutocomplete
            {...useInitialFocus()}
            onInput={onInput}
            options={options}
            value={value}
            placeholder='Select a variable to find nodes using it'
            filter
            revertOnEscapeKeyDown
          />
        </div>
        <Button
          size='sm'
          onClick={onApply}
          disabled={isDisabled}
          variant={hasAppliedStyling ? 'error' : 'primary'}
        >
          {hasAppliedStyling ? 'Clear' : 'Apply'}
        </Button>
      </div>

      {isSearching && (
        <div class='text-sm text-gray-600'>Searching for nodes...</div>
      )}

      {!isSearching && nodesWithVariable.length > 0 && (
        <div class='space-y-2'>
          <h3 class='text-sm font-medium'>
            Found {nodesWithVariable.length} node
            {nodesWithVariable.length === 1 ? '' : 's'} using this variable:
          </h3>
          <div class='space-y-1 max-h-48 overflow-y-auto'>
            {nodesWithVariable.map((node) => (
              <div key={node.id} class='p-2 border rounded'>
                <div class='space-y-1'>
                  <div class='font-medium text-sm'>{node.name}</div>
                  <div class='text-xs text-gray-600'>
                    <span class='font-medium'>{node.type}</span>
                    {node.properties.length > 0 && (
                      <span> - {node.properties.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching &&
        hasSearched &&
        nodesWithVariable.length === 0 &&
        selectedVariable &&
        hasAppliedStyling === false && (
          <div class='text-sm text-gray-600'>
            No nodes found using this variable on the current page.
          </div>
        )}
    </div>
  );
};

export default ThemeVisualizer;
