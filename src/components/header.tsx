import { Fragment, h } from 'preact';
import { useState } from 'preact/hooks';
import Button from './button';
import { emit, on } from '@create-figma-plugin/utilities';
import { APPEND_LOG, LOG_UPDATED } from 'src/events';
import Modal from './modal';

const Header = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [log, setLog] = useState<string[]>([]);

  on(LOG_UPDATED, (log: string[]) => {
    setLog(log);
  });

  function handleOpenButtonClick() {
    setOpen(true);
  }

  function handleOverlayClick() {
    setOpen(false);
  }

  return (
    <div
      className={
        'flex flex-row gap-3 h-10 px-3 text-on-surface-variant dark:text-on-surface-variant-dark items-center justify-between'
      }
    >
      <span>Select your frames, choose the brand, and click Apply</span>

      <Button onClick={handleOpenButtonClick} variant='secondary' size='sm'>
        Log {log.length > 0 ? `(${log.length.toString()})` : ''}
      </Button>

      {open && (
        <Modal onClose={handleOverlayClick} open={open}>
          <div className={'p-4'}>
            {log.length === 0 ? (
              <div>No entries</div>
            ) : (
              log.map((entry, index) => <div key={index}>{entry}</div>)
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Header;
