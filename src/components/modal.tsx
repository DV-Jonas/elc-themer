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

  return (
    <div
      className={`w-screen h-screen absolute top-0 left-0 transition-opacity duration-300 ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        className={`bg-surface text-on-surface h-full transition-transform duration-300 ${
          isVisible && !isClosing
            ? 'transform translate-x-0'
            : 'transform -translate-x-full'
        }`}
        style={{ width: '340px' }}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
