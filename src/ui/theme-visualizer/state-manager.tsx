import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import {
  GET_LOCAL_VARIABLES,
  LOCAL_VARIABLES,
  SEARCH_NODES_WITH_VARIABLE,
  NODES_WITH_VARIABLE,
  APPLY_ACCENT_STYLING,
  CLEAR_VISUALIZATIONS,
  ACCENT_STYLING_APPLIED,
} from '../../events';
import type {
  LocalVariableData,
  NodeWithVariable,
} from '../../handlers/local-variables';
import { TextboxAutocompleteOption } from 'node_modules/@create-figma-plugin/ui/lib';

export type Status =
  | 'idle'
  | 'searching'
  | 'found'
  | 'applying'
  | 'clearing'
  | 'complete';

export type VisualizerState = {
  status: Status;
  selectedVariable: LocalVariableData | null;
  value: string;
  options: Array<TextboxAutocompleteOption>;
  nodesWithVariable: NodeWithVariable[];
  styledNodes: Set<string>;
  foundNodeCount: number;
  hasAppliedStyling: boolean;
};

export type VisualizerActions = {
  onInput: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
};

type GroupedVariables = {
  [header: string]: LocalVariableData[];
};

export const useVisualizerState = (): [VisualizerState, VisualizerActions] => {
  const [status, setStatus] = useState<Status>('idle');
  const [selectedVariable, setSelectedVariable] =
    useState<LocalVariableData | null>(null);
  const [value, setValue] = useState<string>('');
  const [options, setOptions] = useState<Array<TextboxAutocompleteOption>>([]);
  const [nodesWithVariable, setNodesWithVariable] = useState<
    NodeWithVariable[]
  >([]);
  const [styledNodes, setStyledNodes] = useState<Set<string>>(new Set());
  const [foundNodeCount, setFoundNodeCount] = useState(0);
  const [variableMap, setVariableMap] = useState<
    Map<string, LocalVariableData>
  >(new Map());

  // Derived state
  const hasAppliedStyling = styledNodes.size > 0;

  const transformVariablesToOptions = (
    variables: LocalVariableData[]
  ): Array<TextboxAutocompleteOption> => {
    const options: Array<TextboxAutocompleteOption> = [];
    const newVariableMap = new Map<string, LocalVariableData>();
    const grouped: GroupedVariables = {};

    variables.forEach((variable) => {
      const parts = variable.name.split('/');
      if (parts.length >= 2) {
        const category = parts[0];
        const subcategory = parts[1];
        const value = parts.slice(2).join('/');

        if (!grouped[category]) {
          grouped[category] = [];
        }

        const optionValue = value
          ? `${category}-${subcategory} / ${value}`
          : `${category}-${subcategory}`;

        grouped[category].push({
          name: optionValue,
          collectionName: variable.collectionName,
          id: variable.id,
        });

        newVariableMap.set(optionValue, variable);
      }
    });

    const sortedCategories = Object.keys(grouped).sort();

    sortedCategories.forEach((category, index) => {
      if (index > 0) {
        options.push('-');
      }

      const header = category.charAt(0).toUpperCase() + category.slice(1);
      options.push({ header: header });

      const categoryVariables = grouped[category];
      categoryVariables.sort((a, b) => a.name.localeCompare(b.name));

      categoryVariables.forEach((variable) => {
        options.push({ value: variable.name });
      });
    });

    setVariableMap(newVariableMap);
    return options;
  };

  const canApplyVisualizer = (node: NodeWithVariable) => {
    // For stroke properties, only FRAME and INSTANCE support additional strokes
    const canApplyStroke =
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      node.properties.includes('strokes');

    // For fill properties, multiple node types support fills
    const canApplyFill =
      (node.type === 'FRAME' ||
        node.type === 'INSTANCE' ||
        node.type === 'VECTOR' ||
        node.type === 'TEXT' ||
        node.type === 'ELLIPSE' ||
        node.type === 'RECTANGLE' ||
        node.type === 'POLYGON' ||
        node.type === 'STAR') &&
      node.properties.includes('fills');

    // For fontSize, fontWeight, and fontStyle properties, apply fill visualizer to TEXT nodes to highlight typography variable usage
    const canApplyTypographyVisualizer =
      node.type === 'TEXT' &&
      (node.properties.includes('fontSize') ||
        node.properties.includes('fontWeight') ||
        node.properties.includes('fontStyle'));

    return canApplyStroke || canApplyFill || canApplyTypographyVisualizer;
  };

  useEffect(() => {
    const unsubscribeVariables = on(
      LOCAL_VARIABLES,
      (variableData: LocalVariableData[]) => {
        const transformedOptions = transformVariablesToOptions(variableData);
        setOptions(transformedOptions);
      }
    );

    const unsubscribeNodes = on(
      NODES_WITH_VARIABLE,
      (nodes: NodeWithVariable[]) => {
        setNodesWithVariable(nodes);
        setFoundNodeCount(nodes.length);
        setStatus('found');

        const applicableNodes = nodes.filter(canApplyVisualizer);

        if (applicableNodes.length > 0) {
          // Show "found" message briefly, then start applying
          setTimeout(() => {
            setStatus('applying');
            applicableNodes.forEach((node) => {
              emit(APPLY_ACCENT_STYLING, {
                nodeId: node.id,
                properties: node.properties,
              });
            });
          }, 300);
        } else {
          // No applicable nodes, wait then finish
          setTimeout(() => {
            setStatus('complete');
          }, 300);
        }
      }
    );

    const unsubscribeAccent = on(
      ACCENT_STYLING_APPLIED,
      (data: { nodeId: string; action: 'applied' | 'cleared' }) => {
        if (data.action === 'applied') {
          setStyledNodes((prev) => {
            const newSet = new Set(prev);
            newSet.add(data.nodeId);
            return newSet;
          });

          // Always set to complete when styling is applied
          setStatus('complete');
        } else {
          // Clearing - reset everything immediately
          setStyledNodes(new Set());
          setStatus('idle');
          setNodesWithVariable([]);
          setValue('');
          setSelectedVariable(null);
          setFoundNodeCount(0);
        }
      }
    );

    return () => {
      unsubscribeVariables();
      unsubscribeNodes();
      unsubscribeAccent();
    };
  }, []);

  useEffect(() => {
    emit(GET_LOCAL_VARIABLES);
  }, []);

  const onInput = (newValue: string) => {
    setValue(newValue);

    const variable = variableMap.get(newValue);
    setSelectedVariable(variable || null);

    // Reset state when changing variable
    setStyledNodes(new Set());
    setNodesWithVariable([]);
    setFoundNodeCount(0);
    setStatus('idle');
  };

  const onApply = () => {
    if (!selectedVariable) return;

    setStatus('searching');
    setNodesWithVariable([]);
    emit(SEARCH_NODES_WITH_VARIABLE, selectedVariable.id);
  };

  const onClear = () => {
    setStatus('clearing');
    emit(CLEAR_VISUALIZATIONS);
  };

  const state: VisualizerState = {
    status,
    selectedVariable,
    value,
    options,
    nodesWithVariable,
    styledNodes,
    foundNodeCount,
    hasAppliedStyling,
  };

  const actions: VisualizerActions = {
    onInput,
    onApply,
    onClear,
  };

  return [state, actions];
};
