import '!./styles/output.css';
import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Theme } from './themes';
import Header from './components/header';
import Themes from './components/themes';
import { emit, on } from '@create-figma-plugin/utilities';
import Footer from './components/footer';
import { APPLY_THEME } from './events';

function Plugin() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  const onSelectTheme = (theme: Theme) => {
    setSelectedTheme((prevTheme) => (prevTheme === theme ? null : theme));
  };
  const onApplyTheme = (level: 'full' | 'partial') => {
    emit(APPLY_THEME, selectedTheme!.name);
  };

  on('THEMES', setThemes);

  return (
    <div class='flex flex-col h-full'>
      <Header />
      <Themes onSelectTheme={onSelectTheme} themes={themes} />
      <Footer onApplyTheme={onApplyTheme} disabled={!selectedTheme} />
    </div>
  );
}

export default render(Plugin);
