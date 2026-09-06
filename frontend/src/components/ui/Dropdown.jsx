import React, { useState, useRef, useEffect } from 'react';

/**
 * Accessible Dropdown Popover Menu
 */
export const Dropdown = ({
  trigger,
  items = [],
  align = 'right',
  className = '',
  menuWidth = 'w-56',
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  const handleItemClick = (item) => {
    if (item.disabled) return;
    setIsOpen(false);
    if (item.onClick) {
      item.onClick();
    }
  };

  const alignClasses = {
    left: 'left-0',
    right: 'right-0'
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger */}
      <div
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="cursor-pointer inline-flex items-center"
      >
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>

      {/* Menu popover */}
      {isOpen && (
        <div
          role="menu"
          className={`
            absolute ${alignClasses[align] || alignClasses.right} mt-2 ${menuWidth}
            bg-white rounded-2xl border border-stone-200/90 shadow-xl py-1.5 z-50
            transform transition-all animate-in fade-in zoom-in-95 duration-150
            focus:outline-none
          `}
        >
          {items.length > 0
            ? items.map((item, idx) => {
                if (item.divider) {
                  return <div key={`divider-${idx}`} className="my-1 border-t border-stone-100" />;
                }

                const Icon = item.icon;

                return (
                  <button
                    key={item.label || idx}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm font-semibold
                      transition-colors text-left
                      ${item.disabled
                        ? 'text-stone-300 cursor-not-allowed'
                        : item.danger
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-stone-700 hover:bg-amber-50/80 hover:text-amber-800'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="ml-2 text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            : children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
