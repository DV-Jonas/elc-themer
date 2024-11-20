import { Fragment, h, JSX } from 'preact';
import { Loader2 } from 'lucide-preact';

const Button = ({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  children: string | string[] | JSX.Element;
}) => {
  const variantClasses =
    variant === 'secondary'
      ? 'bg-surface-container text-on-surface'
      : 'bg-primary text-on-primary';

  const sizeClasses =
    size === 'sm' ? 'text-sm h-6 rounded-sm' : 'py-3 text-md rounded-md';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold ${variantClasses} ${sizeClasses} ${
        fullWidth ? 'w-full' : 'px-2'
      } disabled:bg-surface-container flex-shrink-0 border-2 border-on-surface disabled:text-on-surface-variant disabled:dark:bg-surface-container-dark disabled:dark:text-on-surface-variant-dark disabled:cursor-not-allowed`}
    >
      {loading ? (
        <div class='flex flow-row items-center gap-2 justify-center'>
          <Loader2 className='animate-spin' size={16} />
          <span>Applying theme...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
