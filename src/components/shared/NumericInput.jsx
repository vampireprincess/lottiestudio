import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Numeric input with drag-to-change functionality
 */
export function NumericInput({
  value = 0,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  suffix = '',
  prefix = '',
  className = '',
  decimals = 1,
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const inputRef = useRef(null);

  const clamp = (v) => Math.max(min, Math.min(max, v));

  const handleMouseDown = useCallback((e) => {
    if (editing || disabled) return;
    if (e.button === 0) {
      dragStart.current = {
        x: e.clientX,
        startValue: value,
        moved: false,
      };

      const onMove = (me) => {
        if (!dragStart.current) return;
        const dx = me.clientX - dragStart.current.x;
        if (!dragStart.current.moved && Math.abs(dx) < 3) return;
        dragStart.current.moved = true;
        setIsDragging(true);
        const sensitivity = me.shiftKey ? 0.01 : me.ctrlKey ? 10 : 1;
        const newVal = clamp(dragStart.current.startValue + dx * step * sensitivity);
        onChange(parseFloat(newVal.toFixed(Math.max(0, Math.round(-Math.log10(step))))));
      };

      const onUp = () => {
        if (dragStart.current && !dragStart.current.moved) {
          // Click → enter edit mode
          setEditValue(String(value));
          setEditing(true);
          setTimeout(() => inputRef.current?.select(), 10);
        }
        dragStart.current = null;
        setIsDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  }, [editing, value, step, min, max, onChange, disabled]);

  const finishEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  }, [editValue, onChange, min, max]);

  const displayValue = typeof value === 'number'
    ? (Number.isInteger(value) ? value : parseFloat(value.toFixed(decimals)))
    : value;

  return (
    <div className="relative flex items-center">
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') finishEdit();
            if (e.key === 'Escape') setEditing(false);
            e.stopPropagation();
          }}
          className={`input text-xs font-mono text-center ${className}`}
          style={{ cursor: 'text' }}
          autoFocus
        />
      ) : (
        <div
          className={`input text-xs font-mono text-center select-none flex items-center justify-center gap-0.5 ${
            isDragging ? 'border-[#7b68ee] cursor-ew-resize' : 'cursor-ew-resize hover:border-[#7b68ee]/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          onMouseDown={handleMouseDown}
          style={{ minWidth: 52 }}
          title="Click to edit, drag to change"
        >
          {prefix && <span className="text-[#5a5a70]">{prefix}</span>}
          <span>{displayValue}</span>
          {suffix && <span className="text-[#5a5a70] text-2xs">{suffix}</span>}
        </div>
      )}
    </div>
  );
}
