import { h, Fragment } from 'preact';
import { Theme } from '../themes';
import List from './list';
import { Star } from 'lucide-preact';
import { TOGGLE_FAVORITE, APPLY_THEME, THEME_APPLIED } from '../events';
import { emit, on } from '@create-figma-plugin/utilities';
import Button from './button';
import { useState } from 'preact/hooks';

type Props = {
  themes: Theme[];
};

const Themes = ({ themes }: Props) => {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(false);

  on(THEME_APPLIED, () => setLoading(false));

  const onSelectedTheme = (theme: Theme) => {
    setSelectedTheme((prevTheme) => (prevTheme === theme ? null : theme));
  };

  const onToggleFavorite = (theme: Theme, favorite: boolean) => {
    theme.favorite = favorite;
    emit(TOGGLE_FAVORITE, theme);
  };

  const onApplyTheme = () => {
    setLoading(true);
    emit(APPLY_THEME, selectedTheme!.name);
  };

  return (
    <div className='flex flex-col justify-between p-3 flex-grow'>
      <List.Root>
        {themes.map((theme, index) => {
          const isLastFavorited =
            theme.favorite && themes.slice(index + 1).every((t) => !t.favorite);

          return (
            <List.Item
              key={theme.name}
              label={theme.name}
              onClick={() => onSelectedTheme(theme)}
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
      <Button
        onClick={onApplyTheme}
        disabled={!selectedTheme}
        loading={loading}
      />
    </div>
  );
};

export default Themes;
