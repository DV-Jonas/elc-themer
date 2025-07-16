import { Fragment, h, JSX } from 'preact';
import { ChevronDown, Loader2 } from 'lucide-preact';
import { useState } from 'preact/hooks';

const Button = ({
  onClick,
  onDropdownClick,
  disabled = false,
  loading = false,
  dropDown = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
}: {
  onClick: () => void;
  onDropdownClick?: (e: Event) => void;
  disabled?: boolean;
  loading?: boolean;
  dropDown?: boolean;
  variant?: 'primary' | 'secondary' | 'error';
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  children: string | string[] | JSX.Element;
}) => {
  const variantClasses =
    variant === 'secondary'
      ? 'bg-surface-container text-on-surface border-2 border-on-surface'
      : variant === 'error'
      ? 'bg-error text-on-error text-on-primary'
      : 'bg-primary text-on-primary';

  const sizeClasses = size === 'sm' ? 'text-sm h-7 rounded-md' : 'py-3 text-md';

  return (
    <Fragment>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`font-bold ${variantClasses} ${sizeClasses} ${
          fullWidth ? 'w-full' : 'px-2'
        } disabled:bg-surface-container flex-shrink-0 disabled:text-on-surface-variant disabled:dark:bg-surface-container-dark disabled:dark:text-on-surface-variant-dark disabled:cursor-not-allowed relative z-10`}
      >
        {loading ? (
          <div class='flex flow-row items-center gap-2 justify-center'>
            <Loader2 className='animate-spin' size={16} />
            {children}
          </div>
        ) : (
          children
        )}

        {dropDown && (
          <div
            onClick={onDropdownClick}
            className={`w-10 h-10 absolute right-0 top-0 flex items-center justify-center ${
              !disabled ? 'cursor-pointer hover:bg-primary-variant' : ''
            }`}
          >
            <ChevronDown size={14} />
          </div>
        )}
      </button>
    </Fragment>
  );
};

export default Button;
