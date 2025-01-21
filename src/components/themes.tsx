import { h } from 'preact';
import { Theme } from '../themes';
import List from './list';
import { Star } from 'lucide-preact';
import { TOGGLE_FAVORITE } from '../events';
import { emit } from '@create-figma-plugin/utilities';
import { useState } from 'preact/hooks';

type Props = {
  themes: Theme[];
  onSelectTheme: (theme: Theme) => void;
};

const Themes = ({ themes, onSelectTheme }: Props) => {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  const onToggleFavorite = (theme: Theme, favorite: boolean) => {
    theme.favorite = favorite;
    emit(TOGGLE_FAVORITE, theme);
  };

  const onSelect = (theme: Theme) => {
    setSelectedTheme(theme);
    onSelectTheme(theme);
  };

  return (
    <div className='flex-grow overflow-y-scroll p-3'>
      <List.Root>
        {themes.map((theme, index) => {
          const isLastFavorited =
            theme.favorite && themes.slice(index + 1).every((t) => !t.favorite);

          return (
            <List.Item
              key={theme.name}
              label={theme.name}
              onClick={() => onSelect(theme)}
              selected={theme == selectedTheme}
              className={isLastFavorited ? 'mb-3' : ''}
            >
              <List.Toggle
                onClick={(isOn) => {
                  onToggleFavorite(theme, isOn);
                }}
                iconOff={Star}
                iconOn={Star}
                on={theme.favorite}
              />
            </List.Item>
          );
        })}
      </List.Root>
    </div>
  );
};

export default Themes;
