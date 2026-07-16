import React, { useState, useRef, useCallback, useEffect } from 'react';
import { colorToHex, hexToColor, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb } from '../../utils/colorUtils.js';

/**
 * Professional color picker with HEX/RGB/HSL/HSV modes
 */
export function ColorPicker({ color = { r: 123, g: 104, b: 238, a: 1 }, onChange }) {
  const [mode, setMode] = useState('hex');
  const [localColor, setLocalColor] = useState(color);

  const svRef = useRef(null);
  const hueRef = useRef(null);
  const alphaRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const hsv = rgbToHsv(localColor.r, localColor.g, localColor.b);
  const hsl = rgbToHsl(localColor.r, localColor.g, localColor.b);

  const updateColor = useCallback((newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  }, [onChange]);

  // SV picker
  const handleSVMouseDown = useCallback((e) => {
    isDragging.current = 'sv';
    const pickSV = (me) => {
      const rect = svRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (me.clientY - rect.top) / rect.height));
      const rgb = hsvToRgb(hsv.h, s * 100, v * 100);
      updateColor({ ...rgb, a: localColor.a });
    };
    pickSV(e);
    const onMove = (me) => { if (isDragging.current === 'sv') pickSV(me); };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [hsv, localColor, updateColor]);

  // Hue picker
  const handleHueMouseDown = useCallback((e) => {
    isDragging.current = 'hue';
    const pickHue = (me) => {
      const rect = hueRef.current?.getBoundingClientRect();
      if (!rect) return;
      const h = Math.max(0, Math.min(360, ((me.clientX - rect.left) / rect.width) * 360));
      const rgb = hsvToRgb(h, hsv.s, hsv.v);
      updateColor({ ...rgb, a: localColor.a });
    };
    pickHue(e);
    const onMove = (me) => { if (isDragging.current === 'hue') pickHue(me); };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [hsv, localColor, updateColor]);

  // Alpha picker
  const handleAlphaMouseDown = useCallback((e) => {
    isDragging.current = 'alpha';
    const pickAlpha = (me) => {
      const rect = alphaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const a = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      updateColor({ ...localColor, a });
    };
    pickAlpha(e);
    const onMove = (me) => { if (isDragging.current === 'alpha') pickAlpha(me); };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [localColor, updateColor]);

  const hex = colorToHex(localColor);
  const hueRgb = hsvToRgb(hsv.h, 100, 100);
  const hueCSS = `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`;

  return (
    <div className="rounded border border-[#2e2e3a] overflow-hidden bg-[#1a1a22]">
      {/* SV gradient picker */}
      <div
        ref={svRef}
        className="relative h-32 cursor-crosshair select-none"
        style={{
          background: `linear-gradient(to bottom, transparent, black),
                       linear-gradient(to right, white, ${hueCSS})`,
        }}
        onMouseDown={handleSVMouseDown}
      >
        {/* Cursor */}
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            transform: 'translate(-50%, -50%)',
            background: hex,
          }}
        />
      </div>

      <div className="p-2 space-y-1.5">
        {/* Hue slider */}
        <div
          ref={hueRef}
          className="relative h-3 rounded cursor-pointer select-none"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
          onMouseDown={handleHueMouseDown}
        >
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none"
            style={{
              left: `${hsv.h / 360 * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: hueCSS,
            }}
          />
        </div>

        {/* Alpha slider */}
        <div className="relative h-3 rounded cursor-pointer select-none" style={{
          backgroundImage: `linear-gradient(to right, transparent, ${hueCSS}),
            repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 0 0 / 8px 8px`,
        }}>
          <div
            ref={alphaRef}
            className="absolute inset-0 rounded cursor-pointer"
            style={{ background: `linear-gradient(to right, transparent, ${colorToHex({ ...localColor, a: 1 })})` }}
            onMouseDown={handleAlphaMouseDown}
          />
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none"
            style={{
              left: `${localColor.a * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: colorToHex(localColor),
            }}
          />
        </div>

        {/* Eyedropper button (EyeDropper API — Chrome 95+) */}
        <div className="flex items-center gap-1 mb-1">
          {typeof EyeDropper !== 'undefined' && (
            <button
              className="flex-1 btn-ghost text-2xs py-0.5 border border-[#2e2e3a] rounded flex items-center justify-center gap-1"
              onClick={async () => {
                try {
                  const dropper = new EyeDropper();
                  const { sRGBHex } = await dropper.open();
                  const c = hexToColor(sRGBHex);
                  if (c) updateColor({ ...c, a: localColor.a });
                } catch (e) { /* user cancelled */ }
              }}
              title="Pick color from screen (Chrome 95+)"
            >
              <span style={{ fontSize: 11 }}>🔍</span> Eyedropper
            </button>
          )}
          <button
            className="btn-ghost text-2xs py-0.5 border border-[#2e2e3a] rounded px-2"
            onClick={() => {
              // Copy current color as hex to clipboard
              navigator.clipboard?.writeText(colorToHex(localColor)).catch(() => {});
            }}
            title="Copy hex to clipboard"
          >
            Copy
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-0.5">
          {['hex', 'rgb', 'hsl', 'hsv'].map(m => (
            <button
              key={m}
              className={`flex-1 py-0.5 text-2xs uppercase rounded ${
                mode === m ? 'bg-[#7b68ee]/20 text-[#a08fff]' : 'text-[#5a5a70] hover:text-[#9090a8]'
              }`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Color inputs */}
        {mode === 'hex' && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded border border-[#3a3a50]" style={{ background: hex }} />
            <input
              type="text"
              value={hex}
              onChange={e => {
                const c = hexToColor(e.target.value);
                if (c) updateColor({ ...c, a: localColor.a });
              }}
              className="input flex-1 text-xs font-mono"
            />
            <input
              type="number"
              value={Math.round(localColor.a * 100)}
              min={0} max={100}
              onChange={e => updateColor({ ...localColor, a: parseInt(e.target.value) / 100 })}
              className="input w-12 text-xs text-center"
            />
          </div>
        )}

        {mode === 'rgb' && (
          <div className="grid grid-cols-4 gap-1">
            {['r', 'g', 'b'].map(ch => (
              <div key={ch}>
                <label className="text-2xs text-[#5a5a70] block text-center">{ch.toUpperCase()}</label>
                <input
                  type="number"
                  value={Math.round(localColor[ch])}
                  min={0} max={255}
                  onChange={e => updateColor({ ...localColor, [ch]: parseInt(e.target.value) || 0 })}
                  className="input w-full text-xs text-center font-mono"
                />
              </div>
            ))}
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">A%</label>
              <input
                type="number"
                value={Math.round(localColor.a * 100)}
                min={0} max={100}
                onChange={e => updateColor({ ...localColor, a: parseInt(e.target.value) / 100 })}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
          </div>
        )}

        {mode === 'hsl' && (
          <div className="grid grid-cols-4 gap-1">
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">H°</label>
              <input
                type="number"
                value={Math.round(hsl.h)}
                min={0} max={360}
                onChange={e => {
                  const rgb = hslToRgb(parseInt(e.target.value), hsl.s, hsl.l);
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">S%</label>
              <input
                type="number"
                value={Math.round(hsl.s)}
                min={0} max={100}
                onChange={e => {
                  const rgb = hslToRgb(hsl.h, parseInt(e.target.value), hsl.l);
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">L%</label>
              <input
                type="number"
                value={Math.round(hsl.l)}
                min={0} max={100}
                onChange={e => {
                  const rgb = hslToRgb(hsl.h, hsl.s, parseInt(e.target.value));
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">A%</label>
              <input
                type="number"
                value={Math.round(localColor.a * 100)}
                min={0} max={100}
                onChange={e => updateColor({ ...localColor, a: parseInt(e.target.value) / 100 })}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
          </div>
        )}

        {mode === 'hsv' && (
          <div className="grid grid-cols-4 gap-1">
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">H°</label>
              <input
                type="number"
                value={Math.round(hsv.h)}
                min={0} max={360}
                onChange={e => {
                  const rgb = hsvToRgb(parseInt(e.target.value), hsv.s, hsv.v);
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">S%</label>
              <input
                type="number"
                value={Math.round(hsv.s)}
                min={0} max={100}
                onChange={e => {
                  const rgb = hsvToRgb(hsv.h, parseInt(e.target.value), hsv.v);
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">V%</label>
              <input
                type="number"
                value={Math.round(hsv.v)}
                min={0} max={100}
                onChange={e => {
                  const rgb = hsvToRgb(hsv.h, hsv.s, parseInt(e.target.value));
                  updateColor({ ...rgb, a: localColor.a });
                }}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-[#5a5a70] block text-center">A%</label>
              <input
                type="number"
                value={Math.round(localColor.a * 100)}
                min={0} max={100}
                onChange={e => updateColor({ ...localColor, a: parseInt(e.target.value) / 100 })}
                className="input w-full text-xs text-center font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
