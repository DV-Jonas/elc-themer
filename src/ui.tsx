import '!./styles/output.css';
import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Theme } from './themes';
import Header from './components/header';
import Themes from './components/themes';
import { on } from '@create-figma-plugin/utilities';

function Plugin() {
  console.log('UI.TSX: Plugin()');
  const [themes, setThemes] = useState<Theme[]>([]);
  on('THEMES', setThemes);

  return (
    <div class='flex flex-col divide-current dark:divide-dark divide-y h-full'>
      <Header />
      <Themes themes={themes} />
    </div>
  );
}

export default render(Plugin);
