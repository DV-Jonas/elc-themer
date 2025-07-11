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

  const groupedNodes = groupNodesByComponent(state.nodesWithVariable);

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
    <div class='p-4 space-y-4'>
      <div class='flex flex-row gap-2 w-full'>
        <div class='flex-1'>
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

      {state.status === 'complete' && state.nodesWithVariable.length > 0 && (
        <div class='space-y-2'>
          <h3 class='text-sm font-medium'>
            Found {state.nodesWithVariable.length} node
            {state.nodesWithVariable.length === 1 ? '' : 's'} using this
            variable:
          </h3>
          <div class='space-y-3 max-h-48 overflow-y-auto'>
            {Object.entries(groupedNodes).map(([componentKey, nodes]) => {
              // Extract clean component name from the key
              const componentName = componentKey.includes('_')
                ? componentKey.split('_')[0]
                : componentKey;

              return (
                <div key={componentKey} class='space-y-1'>
                  <div class='font-medium text-sm bg-gray-100 px-2 py-1 rounded'>
                    {stripEmojis(componentName)}
                  </div>
                  <div class='space-y-1 ml-3'>
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

      {state.status === 'complete' &&
        state.nodesWithVariable.length === 0 &&
        state.selectedVariable &&
        !state.hasAppliedStyling && (
          <div class='text-sm text-gray-600'>
            No nodes found using this variable on the current page.
          </div>
        )}
    </div>
  );
};

export default ThemeVisualizer;
