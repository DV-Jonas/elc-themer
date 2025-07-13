import { h } from 'preact';
import { Search, Check, Hammer, Trash } from 'lucide-preact';
import type { Status } from './state-manager';

type FeedbackProps = {
  status: Status;
  foundNodeCount: number;
};

const Feedback = ({ status, foundNodeCount }: FeedbackProps) => {
  if (status === 'idle' || status === 'complete') {
    return null;
  }

  // For clearing, show only that message
  if (status === 'clearing') {
    return (
      <div class='text-sm text-gray-600 space-y-1'>
        <div class='flex items-center gap-2'>
          <Trash size={12} />
          <span>Clearing styles...</span>
        </div>
      </div>
    );
  }

  // For apply flow, accumulate the steps
  const steps = [];

  if (status === 'searching' || status === 'found' || status === 'applying') {
    steps.push(
      <div class='flex items-center gap-2'>
        <Search size={12} />
        <span>Searching...</span>
      </div>
    );
  }

  if (status === 'found' || status === 'applying') {
    steps.push(
      <div class='flex items-center gap-2'>
        <Check size={12} />
        <span>Found {foundNodeCount} layers</span>
      </div>
    );
  }

  if (status === 'applying') {
    steps.push(
      <div class='flex items-center gap-2'>
        <Hammer size={12} />
        <span>Applying styling</span>
      </div>
    );
  }

  return <div class='text-sm text-gray-600 space-y-1'>{steps}</div>;
};

export default Feedback;
