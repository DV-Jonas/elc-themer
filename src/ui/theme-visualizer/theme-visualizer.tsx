import { h } from 'preact';
import {
  TextboxAutocomplete,
  useInitialFocus,
} from 'node_modules/@create-figma-plugin/ui/lib';
import Button from '../../components/button';
import { useVisualizerState } from './state-manager';
import Feedback from './feedback';

const ThemeVisualizer = () => {
  const [state, actions] = useVisualizerState();

  // TEMP: Mock data for styling
  const mockNodes = [
    {
      id: '1',
      name: 'Button Frame',
      type: 'FRAME',
      properties: ['cornerRadius'],
      parentComponent: {
        id: 'btn1',
        name: 'Button Primary',
        type: 'COMPONENT',
      },
    },
    {
      id: '2',
      name: 'Background',
      type: 'RECTANGLE',
      properties: ['cornerRadius'],
      parentComponent: {
        id: 'btn1',
        name: 'Button Primary',
        type: 'COMPONENT',
      },
    },
    {
      id: '3',
      name: 'Card Container',
      type: 'FRAME',
      properties: ['cornerRadius'],
      parentComponent: { id: 'card1', name: 'Card Default', type: 'COMPONENT' },
    },
    {
      id: '4',
      name: 'Input Field',
      type: 'FRAME',
      properties: ['cornerRadius'],
      parentComponent: { id: 'input1', name: 'Input Text', type: 'COMPONENT' },
    },
    {
      id: '5',
      name: 'Modal Background',
      type: 'RECTANGLE',
      properties: ['cornerRadius'],
      parentComponent: {
        id: 'modal1',
        name: 'Modal Dialog',
        type: 'COMPONENT',
      },
    },
  ];

  const mockSelectedVariable = {
    id: 'var1',
    name: 'border-radius / lg',
    collectionName: 'Spacing',
  };

  // Use mock data when available, otherwise use real state
  const nodesToUse =
    state.nodesWithVariable.length > 0 ? state.nodesWithVariable : mockNodes;
  const selectedVariableToUse = state.selectedVariable || mockSelectedVariable;

  const isDisabled =
    (!state.value || !state.selectedVariable) && !state.hasAppliedStyling;

  // Helper function to strip emojis from text
  const stripEmojis = (text: string): string => {
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ''
      )
      .trim();
  };

  // Group nodes by their parent component
  const groupNodesByComponent = (
    nodes: any[]
  ): { [componentName: string]: any[] } => {
    const grouped: { [componentName: string]: any[] } = {};

    nodes.forEach((node) => {
      // Use component ID for unique grouping
      const componentKey = node.parentComponent
        ? `${node.parentComponent.name}_${node.parentComponent.id}`
        : node.type === 'INSTANCE'
        ? `${node.name}_${node.id}`
        : 'Ungrouped';

      if (!grouped[componentKey]) {
        grouped[componentKey] = [];
      }

      grouped[componentKey].push(node);
    });

    return grouped;
  };

  const groupedNodes = groupNodesByComponent(nodesToUse);
  const componentCount = Object.keys(groupedNodes).length;

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }) => {
    actions.onInput(event.currentTarget.value);
  };

  const handleClick = () => {
    if (state.hasAppliedStyling) {
      actions.onClear();
    } else {
      actions.onApply();
    }
  };

  return (
    <div class='p-4 flex flex-col gap-4'>
      <div class='flex flex-row gap-2 w-full'>
        <div class='grow dark:bg-surface-container-dark bg-surface-container h-[32px]'>
          <TextboxAutocomplete
            {...useInitialFocus()}
            onInput={handleInput}
            options={state.options}
            value={state.value}
            placeholder='Select a variable to find nodes using it'
            filter
            revertOnEscapeKeyDown
          />
        </div>
        <Button
          size='sm'
          onClick={handleClick}
          disabled={isDisabled}
          variant={state.hasAppliedStyling ? 'error' : 'primary'}
        >
          {state.hasAppliedStyling ? 'Clear' : 'Apply'}
        </Button>
      </div>

      <Feedback status={state.status} foundNodeCount={state.foundNodeCount} />

      {((state.status === 'complete' && state.nodesWithVariable.length > 0) ||
        nodesToUse.length > 0) && (
        <div class='space-y-2 h-grow'>
          <h3 class='text-sm font-medium'>
            Found {Object.keys(groupedNodes).length} component
            {Object.keys(groupedNodes).length === 1 ? '' : 's'} using{' '}
            <strong>[{selectedVariableToUse?.name}]</strong>
          </h3>
          <div class='space-y-3 overflow-y-auto'>
            {Object.entries(groupedNodes).map(([componentKey, nodes]) => {
              // Extract clean component name from the key
              const componentName = componentKey.includes('_')
                ? componentKey.split('_')[0]
                : componentKey;

              return (
                <div
                  key={componentKey}
                  class='flex flex-col dark:bg-surface-container-dark rounded-sm'
                >
                  <div class='font-bold text-md border-b-2 p-2 dark:border-surface-dark'>
                    {stripEmojis(componentName)}
                  </div>
                  <div class='flex flex-col gap-2 p-2'>
                    {nodes.map((node: any) => (
                      <div key={node.id} class='text-sm'>
                        <span class='font-medium'>
                          {stripEmojis(node.name)}
                        </span>
                        <span class='text-gray-600 ml-2'>
                          - {node.properties.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeVisualizer;
