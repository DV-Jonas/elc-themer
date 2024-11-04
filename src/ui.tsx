import '!./styles/output.css';
import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { on } from '@create-figma-plugin/utilities';
import { Theme } from './themes';
import Instructions from './components/instructions';
import Themes from './components/themes';

function Plugin() {
  const [themes, setThemes] = useState<Theme[]>([]);
  on('THEMES', setThemes);

  return (
    <div class='flex flex-col divide-current dark:divide-dark divide-y h-full'>
      <Instructions />
      <Themes themes={themes} />
    </div>
  );
}

export default render(Plugin);
