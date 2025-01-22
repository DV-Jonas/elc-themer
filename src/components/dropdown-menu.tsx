import { LucideIcon } from 'lucide-preact';
import { h, JSX } from 'preact';

type rootProps = {
  className?: string;
  children: JSX.Element | JSX.Element[];
};

type itemProps = {
  label: string;
  leadingIcon?: LucideIcon;
  value: string;
  onSelect: (value: string) => void;
};

const root = ({ className, children }: rootProps) => {
  return (
    <div
      className={`dark:border-divider-dark bg-surface-container-high dark:bg-surface-container-high-dark rounded-md flex-grow flex flex-row overflow-hidden ${className}`}
    >
      <div className='flex flex-col w-full'>{children}</div>
    </div>
  );
};

const item = ({
  label,
  value,
  onSelect,
  leadingIcon: LeadingIcon,
}: itemProps) => {
  return (
    <div
      className='flex-grow flex flex-row p-2 hover:bg-on-surface-container-high-variant dark:hover:bg-on-surface-container-high-variant-dark cursor-pointer items-center'
      onClick={() => onSelect(value)}
    >
      {LeadingIcon && <LeadingIcon className='w-3 h-3 mr-2' />}
      {!LeadingIcon && <div className='w-3 h-3 mr-2' />}
      {label}
    </div>
  );
};

const Dropdown = {
  root,
  item,
};

export default Dropdown;
