import { Fragment, h } from 'preact';
import { Loader2 } from 'lucide-preact';

const Button = ({
  onClick,
  disabled = false,
  loading = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='font-bold bg-primary text-on-primary py-3 rounded-md w-full disabled:bg-surface-container disabled:text-on-surface-variant disabled:dark:bg-surface-container-dark disabled:dark:text-on-surface-variant-dark disabled:cursor-not-allowed'
    >
      {loading ? (
        <div class='flex flow-row items-center gap-2 justify-center'>
          <Loader2 className='animate-spin' size={16} />
          <span>Applying theme...</span>
        </div>
      ) : (
        'Apply theme'
      )}
    </button>
  );
};

export default Button;
