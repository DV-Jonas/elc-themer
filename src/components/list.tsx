import { h, ComponentChild } from 'preact';
import IconButton from './toggle-button';
import classNames from 'classnames';
import { LucideIcon } from 'lucide-preact';

type ButtonProps = {
  onClick: (isOn: boolean) => void;
  iconOn: LucideIcon;
  iconOff: LucideIcon;
  on?: boolean;
};

const List = {
  Item: ({
    label,
    onClick,
    selected,
    className,
    children,
  }: {
    label: string;
    onClick: () => void;
    selected?: boolean;
    className?: string;
    children: ComponentChild;
  }) => {
    return (
      <button
        onClick={onClick}
        className={classNames(
          className,
          'flex flex-row justify-between h-10 w-full content-center items-center rounded-md pl-4 pr-1 font-bold',
          {
            'bg-surface-container dark:bg-surface-container-dark hover:bg-on-surface-container-variant hover:dark:bg-on-surface-container-variant-dark hover:cursor-pointer':
              !selected,
            'bg-on-surface-container-high-variant dark:bg-on-surface-container-high-variant-dark':
              selected,
          }
        )}
      >
        <div className={'hover:cursor-pointer'}>{label}</div>
        {children}
      </button>
    );
  },
  Toggle: ({ onClick, iconOn, iconOff, on = false }: ButtonProps) => {
    return (
      <IconButton
        size={'md'}
        onClick={onClick}
        iconOn={iconOn}
        iconOff={iconOff}
        on={on}
      />
    );
  },
  Root: ({
    children,
    className,
  }: {
    children?: h.JSX.Element | h.JSX.Element[];
    className?: string;
  }) => {
    return (
      <div className={classNames(`flex flex-col gap-1`, className)}>
        {children}
      </div>
    );
  },
};

export default List;
