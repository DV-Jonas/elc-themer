import { h } from 'preact';

const Button = ({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='font-bold bg-primary text-on-primary py-3 rounded-md w-full disabled:dark:bg-surface-container-dark disabled:dark:text-on-surface-variant-dark disabled:cursor-not-allowed'
    >
      Apply theme
    </button>
  );
};

export default Button;
