import { Fragment, h } from 'preact';
import Button from './button';
import { THEME_PROGRESS } from 'src/events';
import { on } from '@create-figma-plugin/utilities';
import { THEME_APPLIED } from 'src/events';
import { useState } from 'preact/hooks';
import Overlay from './overlay';
import Dropdown from './dropdown-menu';
import { ThemeDepth } from 'src/themes';
import { Check } from 'lucide-preact';

type Props = {
  disabled?: boolean;
  onApplyTheme: (level: 'full' | 'partial') => void;
};

const Footer = ({ disabled, onApplyTheme }: Props) => {
  const [selectedThemingLevel, setSelectedThemingLevel] =
    useState<ThemeDepth>('full');
  const [loading, setLoading] = useState(false);
  const [dynamicButtonLabel, setDynamicButtonLabel] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const buttonLabels = {
    full: 'Apply full theme',
    spacing: 'Apply spacing',
  };

  const onApply = (level: 'full' | 'partial') => {
    setLoading(true);
    onApplyTheme(level);
  };

  const onDropdownClick = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDropdown(true);
  };

  const onDropdownSelect = (value: string) => {
    setSelectedThemingLevel(value as ThemeDepth);
    setShowDropdown(false);
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
        {loading ? dynamicButtonLabel : buttonLabels[selectedThemingLevel]}
      </Button>

      {showDropdown && (
        <Overlay
          onSelect={() => {}}
          open={showDropdown}
          onClose={() => setShowDropdown(false)}
        >
          <Dropdown.root className='absolute bottom-12 left-3 right-3'>
            <Dropdown.item
              label='Full theme'
              leadingIcon={selectedThemingLevel === 'full' ? Check : undefined}
              value='full'
              onSelect={onDropdownSelect}
            />
            <Dropdown.item
              label='Spacing'
              leadingIcon={
                selectedThemingLevel === 'spacing' ? Check : undefined
              }
              value='spacing'
              onSelect={onDropdownSelect}
            />
          </Dropdown.root>
        </Overlay>
      )}
    </div>
  );
};

export default Footer;
