import { Fragment, h } from 'preact';
import { useState } from 'preact/hooks';
import Button from './button';
import { emit, on } from '@create-figma-plugin/utilities';
import { APPEND_LOG, LOG_UPDATED, SELECT_NODE } from 'src/events';
import Modal from './modal';
import { ErrorWithPayload } from 'src/util';

const Header = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [log, setLog] = useState<ErrorWithPayload[]>([]);

  on(LOG_UPDATED, (log: ErrorWithPayload[]) => {
    setLog(log);
  });

  function handleOpenButtonClick() {
    setOpen(true);
  }

  function handleOverlayClick() {
    setOpen(false);
  }

  function handleSelectNode(nodeId: string | undefined) {
    if (nodeId) {
      emit(SELECT_NODE, nodeId);
    }
  }

  return (
    <div
      className={
        'flex flex-row gap-3 h-10 px-3 text-on-surface-variant dark:text-on-surface-variant-dark items-center justify-between shrink-0 fixed top-0 left-0 right-0'
      }
    >
      <div>Select your frames, choose the brand, and click Apply</div>

      {log.length > 0 && (
        <Button onClick={handleOpenButtonClick} variant='error' size='sm'>
          Log
        </Button>
      )}

      {open && (
        <Modal onClose={handleOverlayClick} open={open}>
          <div className={'p-4 text-xs w-full'}>
            {log.length === 0 ? (
              <div>No entries</div>
            ) : (
              Array.from(new Set(log)).map((entry, index) => (
                <div
                  className={'flex flex-row items-center w-full text-xs mb-2'}
                  key={index}
                >
                  <div className='flex-grow'>{entry.cause.message}</div>
                  <button
                    className='ml-2 text-primary underline flex-shrink-0'
                    onClick={() => handleSelectNode(entry.cause?.node?.id)}
                  >
                    Select Node
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Header;
