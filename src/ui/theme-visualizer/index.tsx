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
          <div class='space-y-1 max-h-48 overflow-y-auto'>
            {state.nodesWithVariable.map((node) => (
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
