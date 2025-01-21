import { Fragment, h } from 'preact';
import Button from './button';
import { THEME_PROGRESS } from 'src/events';
import { on } from '@create-figma-plugin/utilities';
import { THEME_APPLIED } from 'src/events';
import { useState } from 'preact/hooks';
import Overlay from './overlay';
import Dropdown from './dropdown-menu';

type Props = {
  disabled?: boolean;
  onApplyTheme: (level: 'full' | 'partial') => void;
};

const Footer = ({ disabled, onApplyTheme }: Props) => {
  const buttonLabel = 'Apply theme';
  const [loading, setLoading] = useState(false);
  const [dynamicButtonLabel, setDynamicButtonLabel] = useState(buttonLabel);
  const [showDropdown, setShowDropdown] = useState(false);

  const onApply = (level: 'full' | 'partial') => {
    setLoading(true);
    onApplyTheme(level);
  };

  const onDropdownClick = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(true);
  };

  on(THEME_PROGRESS, (progress: string) => setDynamicButtonLabel(progress));
  on(THEME_APPLIED, () => setLoading(false));

  return (
    <div className='flex flex-col w-full items-center min-h-10 shrink-0'>
      {loading && (
        <div className='text-on-surface-variant my-2'>
          <span>Applying theme (this might take a while)</span>
        </div>
      )}
      <Button
        onClick={() => onApply('full')}
        fullWidth
        dropDown
        onDropdownClick={onDropdownClick}
        disabled={disabled}
        loading={loading}
      >
        {loading ? dynamicButtonLabel : buttonLabel}
      </Button>

      {showDropdown && (
        <Overlay
          onSelect={() => {}}
          open={showDropdown}
          onClose={() => setShowDropdown(false)}
        >
          <Dropdown.root
            className='absolute bottom-12 left-3 right-3'
            onSelect={() => {}}
          >
            <Dropdown.item label='first' value='first' onClick={() => {}} />
            <Dropdown.item label='senond' value='senond' onClick={() => {}} />
          </Dropdown.root>
        </Overlay>
      )}
    </div>
  );
};

export default Footer;
