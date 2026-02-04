import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, closeOnOverlay = true }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    // Prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = () => { if (closeOnOverlay) onClose?.(); };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100]"
      style={{ backdropFilter: 'blur(10px)' }}
      onClick={handleOverlayClick}
    >
      {/* semi-transparent overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} />
      {/* modal container */}
      <div
        className="relative bg-white rounded-lg shadow-lg w-[60vw] max-w-[1000px] max-h-[80vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-lg">{title}</div>
          <button type="button" className="px-2 py-1 rounded border" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
