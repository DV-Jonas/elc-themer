import { h, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

type ModalProps = {
  onClose: () => void;
  children: JSX.Element;
  open: boolean;
};

const Modal = ({ onClose, children, open }: ModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [open]);

  const handleOverlayClick = () => {
    setIsClosing(true);
  };

  const handleTransitionEnd = () => {
    if (isClosing) {
      setIsVisible(false);
      onClose();
    }
  };

  const stopPropagation = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <div
      className={`w-screen absolute top-0 left-0 bottom-0 transition-opacity duration-300 z-50 overflow-y-scroll ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 1)' }}
      onClick={handleOverlayClick}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        onClick={stopPropagation}
        className={`bg-surface text-on-surface absolute top-0 left-0 bottom-0 transition-transform duration-300 overflow-y-scroll ${
          isVisible && !isClosing
            ? 'transform translate-x-0'
            : 'transform -translate-x-full'
        }`}
        style={{ width: '340px', height: '100%' }}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
