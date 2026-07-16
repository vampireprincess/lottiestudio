import React from 'react';
import { useEditorStore } from '../../stores/editorStore.js';

/**
 * SnapGuides — renders center guide lines as an SVG overlay.
 * Must be used INSIDE an <svg> element (e.g. inside CanvasRenderer or CanvasOverlay).
 * Returns null when showGuides is false to avoid any DOM issues.
 */
export function SnapGuides() {
  const { showGuides, project } = useEditorStore();

  if (!showGuides) return null;

  const cx = project.width / 2;
  const cy = project.height / 2;

  return (
    <>
      {/* Center horizontal guide */}
      <line
        x1={0} y1={cy} x2={project.width} y2={cy}
        stroke="rgba(123,104,238,0.25)"
        strokeWidth={0.5}
        strokeDasharray="4,4"
        style={{ pointerEvents: 'none' }}
      />
      {/* Center vertical guide */}
      <line
        x1={cx} y1={0} x2={cx} y2={project.height}
        stroke="rgba(123,104,238,0.25)"
        strokeWidth={0.5}
        strokeDasharray="4,4"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
