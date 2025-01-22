import { h, JSX } from 'preact';

type OverlayProps = {
  onSelect: (option: string) => void;
  children: JSX.Element;
  open: boolean;
  onClose: () => void;
};

const Overlay = ({ onSelect, open, onClose, children }: OverlayProps) => {
  const onClick = (event: Event) => {
    stopPropagation(event);
    onClose();
  };

  const stopPropagation = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <div
      onClick={onClick}
      className='w-screen h-screen top-0 left-0 absolute z-50'
    >
      {children}
    </div>
  );
};

export default Overlay;
