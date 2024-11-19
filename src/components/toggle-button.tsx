import { h } from 'preact';
import { useState } from 'preact/hooks';
import classNames from 'classnames';
import { LucideIcon } from 'lucide-preact';

const BUTTON_SIZE = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const;

const ICON_SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

type ButtonSize = keyof typeof BUTTON_SIZE;

const ToggleButton = ({
  size,
  iconOn: IconOn,
  iconOff: IconOff,
  onClick,
  on = false,
}: {
  size: ButtonSize;
  iconOn: LucideIcon;
  iconOff: LucideIcon;
  onClick: (isOn: boolean) => void;
  on?: boolean;
}) => {
  const [isOn, setIsOn] = useState(on);
  const iconSizeClass = ICON_SIZE_CLASSES[size];

  const handleClick = () => {
    setIsOn(!isOn);
    onClick(!isOn);
  };

  return (
    <button
      className={classNames(
        'hover:cursor-pointer hover:dark:bg-surface-container-dark hover:bg-surface-container p-2 rounded-md',
        iconSizeClass
      )}
      onClick={handleClick}
    >
      {isOn ? (
        <IconOn
          size={14}
          className='fill-on-surface dark:fill-on-surface-dark'
        />
      ) : (
        <IconOff
          size={14}
          className='stroke-on-surface dark:stroke-on-surface-dark'
        />
      )}
    </button>
  );
};

export default ToggleButton;
