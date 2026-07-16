import React, { useState } from 'react';
import { ModalBackdrop } from './ActiveModal.jsx';
import { Book, Layers, Move, Pen, Clock, Download, Zap, Eye, Grid, HelpCircle } from 'lucide-react';

const SECTIONS = [
  {
    id: 'overview',
    icon: Book,
    title: 'Overview',
    content: `
Lottie Studio is a professional local animation editor for creating SVG and Lottie animations.
Everything is stored locally — no internet, no account required.

**Main areas of the interface:**
- **Toolbar** (left) — drawing and editing tools
- **Canvas** (center) — your animation workspace
- **Layers Panel** (left panel) — all elements in your project
- **Properties Panel** (right) — settings for the selected element
- **Timeline** (bottom) — keyframe animation editor
- **Animation Panel** — presets, organic motion, easing, stagger

**Getting started:**
1. Draw a shape using the toolbar, or import an SVG/Lottie file
2. Select elements by clicking them on the canvas
3. Adjust position, size, color in the Properties panel
4. Add keyframes in the Timeline to animate
5. Export via File → Export or the Export button
    `.trim()
  },
  {
    id: 'tools',
    icon: Pen,
    title: 'Tools',
    content: `
**Select Tool (V)** — click any element to select it. Drag to move. Hold Shift to add to selection. Hold Alt while dragging to duplicate.

**Edit Shape Points (A)** — click to switch to node editing mode. Drag anchor points to reshape paths. Drag bezier handles (orange = in, blue = out). Hold Alt while dragging a handle to break it (independent mode). Hold Shift while dragging to snap to 45° angles.

**Pen Tool (P)** — click to add anchor points and draw paths. Double-click to finish an open path. Click near the first point (inside the purple circle) to close the path. Closed paths support fill colors.

**Pencil Tool (N)** — drag freehand to draw a stroke. Does NOT auto-close the path. Use the path operations if you need to close it manually.

**Vector Brush (B)** — drag freehand to draw a thick stroke. Similar to Pencil but with a wider brush width (6px by default). Adjust in the Stroke properties.

**Curvature Tool (Shift+C)** — click to add smooth curve points. Auto-generates bezier handles between points. Double-click to finish. Good for smooth organic shapes.

**Mask Brush (M)** — drag on the canvas while a layer is selected to paint a mask. The masked area reveals (Add mode) or hides (Subtract mode) the layer content.

**Eraser (E)** — click on any layer to delete it from the canvas.

**Line Tool (L)** — click and drag to draw a straight line.

**Shapes** — click the Shapes button (grid icon) to open the shape picker. All shapes are visual icons. Click to select, then draw on canvas by dragging.

**Zoom Tool (Z)** — click to zoom in. Hold Alt and click to zoom out. Ctrl+Scroll zooms from anywhere.

**Pan Tool (H)** — drag to pan the canvas. Middle-mouse drag also works.
    `.trim()
  },
  {
    id: 'canvas',
    icon: Grid,
    title: 'Canvas',
    content: `
**Zoom:** Ctrl+Scroll to zoom in/out. Ctrl+0 to fit. Use the zoom selector in the bottom right.

**Pan:** Middle-mouse drag, or hold H and drag.

**Rulers:** Shown when rulers are enabled. Click and drag from rulers to create guides.

**Grid:** Enable in the Preview Mode selector (bottom right). Helps with alignment.

**Canvas modes (bottom right):**
- Normal — standard view
- Dark BG — dark background preview
- Light BG — light background preview  
- Transparent — checkerboard (shows what's transparent)
- Outline — wireframe view of all paths

**Canvas size:** In the Properties panel (when nothing is selected), set width, height, FPS, and duration. Use the Preset dropdown for common sizes.

**Selecting elements:**
- Click any shape, SVG, or path to select it
- Shift+click to add to selection
- Click and drag on empty area to box-select multiple elements
- Ctrl+A to select all

**Moving elements:**
- Drag any selected element to move it
- Alt+drag to create a copy and move it
- Arrow keys to nudge by 1px (Shift+Arrow = 10px)
- Enter numeric values in the Transform section of Properties
    `.trim()
  },
  {
    id: 'layers',
    icon: Layers,
    title: 'Layers',
    content: `
The Layers panel shows all elements in your project, top to bottom.

**Visibility (eye icon):** Click to hide/show a layer. Hidden layers still export unless removed.

**Lock (lock icon):** Click to lock a layer. Locked layers cannot be selected or moved.

**Solo (S button):** Shows only this layer, hides all others temporarily.

**Rename:** Double-click the layer name to edit it.

**Reorder:** Drag layers up or down to change stacking order.

**Color labels:** Click the colored dot to cycle through label colors for organization.

**Context menu (right-click):** Duplicate, group, move up/down, lock, hide, set color label, delete.

**Groups:** Select multiple layers (Shift+click) then Ctrl+G or use the Group button to combine them.

**Search:** Type in the search box to filter layers by name.

**Filter by type:** Use the tabs (All, Shape, Group, SVG, Mask) to show only certain types.

**DnD reorder:** Drag any layer to a new position. A blue indicator shows where it will drop.
    `.trim()
  },
  {
    id: 'properties',
    icon: Move,
    title: 'Properties & Transform',
    content: `
The Properties panel shows settings for the selected element. It has 6 tabs:

**Transform tab:**
- Position X/Y — absolute position on canvas
- Scale W/H — size multiplier (100% = original size)
- Rotation — in degrees
- Skew X/Y — slant the element
- Anchor X/Y — the pivot point for rotation and scale transforms
- Opacity — 0 = invisible, 100 = fully visible
- Blend Mode — how this layer composites with layers below
- Frame Range — In/Out frames for when this layer is visible

**Anchor Point:**
Use the 3×3 grid to quickly set the anchor to one of 9 preset positions (top-left, center, bottom-right, etc.). Or set Custom Anchor Point to drag it freely on the canvas.

The anchor point controls where rotation and scale happen. For example, to make an element "grow from the bottom", set the anchor to "bottom center" then scale from 0% to 100%.

**Fill tab:** Add and manage fill colors. Types: Solid, Linear Gradient, Radial Gradient, Angular, Diamond, Reflected.

**Stroke tab:** Add outline strokes. Control width, color, line cap (butt/round/square), line join, and dash pattern.

**FX tab:** Add glow, neon, shadow effects. OBS-compatible Gaussian blur copies.

**Mask tab:** Add masks to clip or reveal the layer. Modes: Add (reveal), Subtract (hide), Intersect, Difference.

**Trim tab:** Animate the "draw-on" effect for stroke paths. Trim Start and Trim End control what portion of the stroke is visible. Animate them for draw-on effects.
    `.trim()
  },
  {
    id: 'timeline',
    icon: Clock,
    title: 'Timeline & Animation',
    content: `
The Timeline shows your animation keyframes. Keyframes are the points in time where you set specific values — the editor automatically interpolates between them.

**Adding keyframes:**
1. Enable Auto-Key (K button in toolbar or timeline) — values are recorded automatically when you change anything
2. Or: move to a frame, change a value, then click the ◆ Key button next to the property in Properties

**Playback controls:**
- Play/Pause (Space) — start or stop animation
- ◀ ▶ buttons — previous/next frame
- Loop modes: Loop, Ping-Pong, Once
- Speed: 0.25x to 4x

**Editing keyframes:**
- Click a diamond to select it
- Drag a diamond to move it in time
- Ctrl+C / Ctrl+V to copy/paste keyframes
- ⇄ button to reverse selected keyframes
- ½× / 2× buttons to stretch or compress timing
- Right-click a keyframe to delete it

**Work area:**
Set In/Out markers to preview only part of your animation.

**Easing:**
Select keyframes, then click "Easing ▲" to choose easing type (linear, ease, bounce, elastic, etc.) or open the Graph Editor for precise bezier curve control.

**Markers:**
Add named markers (flag button) to label sections: Intro, Loop, Outro, etc. Used for segment export.

**Loop Maker:**
In the Animation Panel → Loop tab, make your animation seamless with one click.

**Stagger:**
In the Animation Panel → Stagger tab, automatically offset animation timing across multiple selected layers.
    `.trim()
  },
  {
    id: 'animation-panel',
    icon: Zap,
    title: 'Animation Tools',
    content: `
Open the Animation Tools panel by clicking the ⚡ button in the top bar.

**Presets tab:**
Choose from 38 built-in animation presets:
- Entrance: Fade In, Scale In, Pop In, Slide In, Bounce In, Draw On, etc.
- Idle: Float, Sway, Pulse, Breathe, Flicker, Wiggle, Hover, etc.
- Exit: Fade Out, Shrink, Slide Out, Spin Out, etc.

Settings: Start Frame, Duration, Intensity, Direction, Easing, Loop, Ping-Pong.

Apply presets to all selected layers at once. Use the "Delay per layer" setting to stagger them automatically.

**Organic tab:**
13 natural motion generators:
- Growing Vine, Trim Path Draw-On
- Hanging Swing, Pendulum
- Spider Climb (with thread growth)
- Wind Reactive, Fairy Lights Flicker
- Butterfly Wing Flap, Drip/Drop
- Cobweb Drift, Hanging Leaves
- Swinging Decoration, Lantern (swing + flicker)

**Seed:** A number that controls the random variation. Same seed = same result every time. Click the Shuffle button to try a different seed.

**Easing tab:** Select keyframes then choose easing. Graph Editor for precise bezier control. Reverse or Mirror easing. Apply to all keyframes on a property.

**Stagger tab:** Offset timing across multiple selected layers. Order modes: Layer Order, Left→Right, Top→Bottom, From Center, Random, etc.

**Loop tab:** Make animations seamless. Analyzes start/end values and auto-fixes jumps. Ping-Pong mode.

**Markers tab:** Add/edit named timeline segments (Intro, Loop, Outro, etc.) for segment export.

**Motion tab:** Apply a path to any layer — it follows the path automatically.

**Parent tab:** Link layers so children inherit parent transforms. Set Hang Points, Anchor Points, Follow Points.
    `.trim()
  },
  {
    id: 'import-export',
    icon: Download,
    title: 'Import & Export',
    content: `
**Importing SVG:**
File → Import SVG (or Ctrl+O). SVGs are automatically scaled to fit the canvas.

Import modes:
- Preserve Structure — keeps all groups and hierarchy as separate layers
- Single Object — imports as one layer
- Expand to Shapes — flattens everything into individual editable layers

After import, you can edit fill colors, strokes, gradients, and apply animations.

**Importing Lottie:**
File → Import Lottie. Supports .json and .lottie files.
Imported layers can have colors and timing edited.

**Exporting:**
Click the Export button or File → Export (Ctrl+E).

Export formats:
- **Lottie JSON** — for Lottie players, web, OBS browser source
- **Lottie Minified** — smaller file size
- **dotLottie** — modern format with themes/slots support
- **Animated SVG** — CSS animations, works in browsers
- **Static SVG** — current frame as SVG
- **WebM** — video with transparency (Chrome/Edge/Firefox)
- **GIF** — animated GIF (256 colors per frame)
- **PNG Sequence** — individual frames as PNG files

**Segment export:**
Select which part to export:
- Full Animation
- Work Area (set In/Out in timeline)
- Custom Range (specific frames)
- Named Marker (Intro, Loop, Outro, etc.)

**OBS users:** Use the "OBS Lottie" quick preset. Gaussian blur glow effects are tested and compatible.

**Saving your project:**
File → Save (Ctrl+S) saves to browser storage. Autosave runs every 30 seconds automatically.
File → Open (Ctrl+O) opens the project browser.
    `.trim()
  },
  {
    id: 'shortcuts',
    icon: HelpCircle,
    title: 'Keyboard Shortcuts',
    content: `
**Tools:**
V = Select Tool
A = Edit Shape Points (Node Editor)
P = Pen Tool
N = Pencil Tool
B = Vector Brush
M = Mask Brush
E = Eraser
L = Line Tool
Shift+C = Curvature Tool
Z = Zoom Tool
H = Pan Tool
K = Toggle Auto-Key

**Editing:**
Ctrl+Z = Undo
Ctrl+Y or Ctrl+Shift+Z = Redo
Ctrl+D = Duplicate
Ctrl+G = Group selected layers
Ctrl+A = Select all
Delete / Backspace = Delete selected
Escape = Deselect / Cancel current action
Alt+Drag = Duplicate and move

**File:**
Ctrl+S = Save project
Ctrl+O = Open project
Ctrl+E = Export

**Canvas:**
Space = Play/Pause animation
Arrow keys = Nudge element 1px
Shift+Arrow = Nudge element 10px
Home = Go to frame 0
End = Go to last frame
← → = Previous/Next frame
Shift+← → = Jump 10 frames
Ctrl+Scroll = Zoom in/out
Ctrl+0 = Fit canvas to screen
Middle-drag = Pan canvas

**Timeline:**
Ctrl+C = Copy selected keyframes
Ctrl+V = Paste keyframes at current frame
    `.trim()
  },
];

export function HelpModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('overview');
  const section = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={i} className="text-sm font-bold text-[#a08fff] mt-3 mb-1 first:mt-0">{line.replace(/\*\*/g, '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.slice(2);
        // Handle bold within bullet
        const parts = content.split(/(\*\*[^*]+\*\*)/);
        return (
          <li key={i} className="text-xs text-[#b0b0c0] ml-3 mb-0.5 list-disc">
            {parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-[#f0f0f5]">{p.replace(/\*\*/g, '')}</strong> : p)}
          </li>
        );
      }
      if (line === '') return <div key={i} className="h-1" />;
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      return (
        <p key={i} className="text-xs text-[#b0b0c0] mb-1 leading-relaxed">
          {parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-[#f0f0f5]">{p.replace(/\*\*/g, '')}</strong> : p)}
        </p>
      );
    });
  };

  return (
    <ModalBackdrop onClose={onClose} width="max-w-3xl">
      <div className="flex flex-col" style={{ height: '80vh', maxHeight: 700 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e3a] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Book size={16} className="text-[#7b68ee]"/>
            <h2 className="text-base font-semibold text-[#f0f0f5]">Lottie Studio — Help</h2>
          </div>
          <button className="btn-icon text-lg" onClick={onClose}>✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 flex-shrink-0 border-r border-[#2e2e3a] overflow-y-auto py-2" style={{ background: '#12121a' }}>
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                    activeSection === s.id
                      ? 'bg-[#7b68ee]/20 text-[#a08fff] border-r-2 border-[#7b68ee]'
                      : 'text-[#9090a8] hover:bg-[#22222a] hover:text-[#f0f0f5]'
                  }`}
                  onClick={() => setActiveSection(s.id)}
                >
                  <Icon size={13} className="flex-shrink-0"/>
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-base font-bold text-[#f0f0f5] mb-3">{section.title}</h2>
            <div className="space-y-0.5">
              {renderContent(section.content)}
            </div>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}
