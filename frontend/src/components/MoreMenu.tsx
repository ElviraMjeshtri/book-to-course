import React, { useState, useRef, useEffect } from "react";

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface MoreMenuProps {
  items: MenuItem[];
  label?: string;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ items, label = "⋯" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="more-menu" ref={menuRef}>
      <button
        className="more-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="More actions"
      >
        {label}
      </button>
      {isOpen && (
        <div className="more-menu-dropdown">
          {items.map((item) => (
            <button
              key={item.id}
              className={`more-menu-item ${item.destructive ? "destructive" : ""}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

