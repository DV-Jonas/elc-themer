import { h } from 'preact';
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
        <div>- Clearing styles...</div>
      </div>
    );
  }

  // For apply flow, accumulate the steps
  const steps = [];

  if (status === 'searching' || status === 'found' || status === 'applying') {
    steps.push(<div>- Searching...</div>);
  }

  if (status === 'found' || status === 'applying') {
    steps.push(<div>- Found {foundNodeCount} layers</div>);
  }

  if (status === 'applying') {
    steps.push(<div>- Applying styling</div>);
  }

  return <div class='text-sm text-gray-600 space-y-1'>{steps}</div>;
};

export default Feedback;
