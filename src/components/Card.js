// src/components/Card.js — Cornerstone Card
const { useState, useContext } = React;

window.Card = function ({ children, style = {}, hover = false, onClick, onMouseEnter, onMouseLeave }) {
  const { T } = useContext(AppCtx);
  const [hov, setHov] = useState(false);
  
  const handleMouseEnter = () => {
    if (hover) setHov(true);
    if (onMouseEnter) onMouseEnter();
  };
  
  const handleMouseLeave = () => {
    if (hover) setHov(false);
    if (onMouseLeave) onMouseLeave();
  };
  
  return React.createElement('div', {
    onClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    style: {
      background: T.surface,
      border: `1px solid ${hov ? (T.borderHover || 'rgba(212,148,58,0.25)') : (T.borderLight || T.border)}`,
      borderRadius: 18,
      transition: 'all 0.25s ease',
      position: 'relative',
      overflow: 'hidden',
      ...(hover ? {
        cursor: onClick ? 'pointer' : 'default',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 28px rgba(212,148,58,0.08)' : 'none',
      } : {}),
      ...style,
    },
  }, children);
};

// Note: Lbl and Btn are defined in utils.js
