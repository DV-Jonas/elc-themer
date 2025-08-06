import { Fragment, h } from 'preact';
import { useState } from 'preact/hooks';
import { Theme, ThemeDepth } from '../themes';
import Header from '../components/header';
import Themes from '../components/themes';
import { emit, on } from '@create-figma-plugin/utilities';
import Footer from '../components/footer';
import { APPLY_THEME } from '../events';

function ThemeSelector() {
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  // Filter themes to only show those with actual themeable collections (not just swap collections)
  const themes = allThemes.filter(theme => 
    theme.collections.some(collection => 
      collection.name === '1.theme' || collection.name === '2.responsive'
    )
  );

  const onSelectTheme = (theme: Theme) => {
    setSelectedTheme((prevTheme) => (prevTheme === theme ? null : theme));
  };

  const onApplyTheme = (depth: ThemeDepth) => {
    emit(APPLY_THEME, selectedTheme!.name, depth);
  };

  on('THEMES', setAllThemes);

  return (
    <Fragment>
      <Header />
      <Themes onSelectTheme={onSelectTheme} themes={themes} />
      <Footer onApplyTheme={onApplyTheme} disabled={!selectedTheme} />
    </Fragment>
  );
}

export default ThemeSelector;
