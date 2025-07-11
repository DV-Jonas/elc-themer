import '!./styles/output.css';
import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import { FILE_NAME, GET_FILE_NAME } from './events';
import config from '../config';
import ThemeVisualizer from './ui/theme-visualizer';
import ThemeSelector from './ui/theme-selector';

function Plugin() {
  const [isSandBoxfile, setIsSandBoxfile] = useState<boolean>(false);

  useEffect(() => {
    return on(FILE_NAME, (name) => {
      setIsSandBoxfile(name.toLowerCase().includes(config.sandboxFileName));
    });
  }, []);

  emit(GET_FILE_NAME);

  return (
    <div class='flex flex-col h-full'>
      {isSandBoxfile ? <ThemeVisualizer /> : <ThemeSelector />}
    </div>
  );
}

export default render(Plugin);
