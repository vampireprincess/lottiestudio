import React, { useRef, useState, useCallback } from 'react';

/**
 * Simple resizable panel layout component
 * Works with CSS flex and mouse drag
 */
export function ResizablePanelGroup({ direction = 'horizontal', children, className = '' }) {
  return (
    <div
      className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function ResizablePanel({ defaultSize, minSize = 100, maxSize = Infinity, children, className = '' }) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ flexBasis: defaultSize, flexShrink: 0, flexGrow: 0, minWidth: minSize, maxWidth: maxSize }}
    >
      {children}
    </div>
  );
}

export function ResizableFlexPanel({ children, className = '' }) {
  return (
    <div className={`flex-1 overflow-hidden min-w-0 min-h-0 ${className}`}>
      {children}
    </div>
  );
}

export function ResizableHandle({ direction = 'horizontal', onResize }) {
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (me) => {
      if (!isDragging.current) return;
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (onResize) onResize(direction === 'horizontal' ? dx : dy);
    };

    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [direction, onResize]);

  return (
    <div
      className={`flex-shrink-0 transition-colors ${
        direction === 'horizontal'
          ? 'w-[3px] cursor-col-resize hover:bg-[#7b68ee]'
          : 'h-[3px] cursor-row-resize hover:bg-[#7b68ee]'
      }`}
      style={{ background: 'transparent' }}
      onMouseDown={handleMouseDown}
    />
  );
}
