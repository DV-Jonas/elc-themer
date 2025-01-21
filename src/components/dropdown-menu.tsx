import { h, JSX } from 'preact';

type rootProps = {
  onSelect: (option: string) => void;
  className?: string;
  children: JSX.Element | JSX.Element[];
};

type itemProps = {
  label: string;
  value: string;
  onClick: (value: string) => void;
};

const root = ({ onSelect, className, children }: rootProps) => {
  return (
    <div
      className={`dark:border-divider-dark bg-surface-container-high dark:bg-surface-container-high-dark rounded-md flex-grow flex flex-row overflow-hidden ${className}`}
    >
      <div className='flex flex-col w-full'>{children}</div>
    </div>
  );
};

const item = ({ label, value, onClick }: itemProps) => {
  return (
    <div
      className='flex-grow flex flex-row p-2 hover:bg-on-surface-container-high-variant dark:hover:bg-on-surface-container-high-variant-dark cursor-pointer'
      onClick={() => onClick(value)}
    >
      {label}
    </div>
  );
};

const Dropdown = {
  root,
  item,
};

export default Dropdown;
