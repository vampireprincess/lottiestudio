/**
 * Color Store — Faza 3
 * Global Color system, Color History, Swatches, Palettes
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import {
  saveColorSwatch, getColorSwatches,
  saveGradientSwatch, getGradientSwatches, deleteGradientSwatch,
  setPref, getPref
} from '../db/index.js';

export const useColorStore = create(
  immer((set, get) => ({
    // Recent colors (last 24)
    recentColors: [],

    // Color history (last 64)
    colorHistory: [],

    // Saved named colors
    savedColors: [],

    // Gradient swatches (from DB)
    gradientSwatches: [],
    gradientSwatchCategory: 'All',
    gradientSwatchCategories: ['All','Pastel','Neon','Sunset','Ocean','Metallic','Gold','Silver','Dark','Transparent Fade','Candy','Holographic','Forest','Custom'],

    // Loading states
    isLoadingSwatches: false,

    // ── Actions ──────────────────────────────────────────────────────────────

    /** Add to recent colors */
    addRecentColor(color) {
      set(state => {
        const hex = colorToHexStr(color);
        state.recentColors = [color, ...state.recentColors.filter(c => colorToHexStr(c) !== hex)].slice(0, 24);
        state.colorHistory = [color, ...state.colorHistory.filter(c => colorToHexStr(c) !== hex)].slice(0, 64);
      });
    },

    /** Load gradient swatches from DB */
    async loadGradientSwatches() {
      set(state => { state.isLoadingSwatches = true; });
      try {
        const swatches = await getGradientSwatches();
        set(state => { state.gradientSwatches = swatches; state.isLoadingSwatches = false; });
      } catch (err) {
        set(state => { state.isLoadingSwatches = false; });
      }
    },

    /** Save gradient swatch to DB */
    async saveGradientSwatch(swatch) {
      const id = await saveGradientSwatch({
        ...swatch,
        id: undefined,
        category: swatch.category || 'Custom',
        isBuiltin: false,
      });
      await get().loadGradientSwatches();
      return id;
    },

    /** Delete gradient swatch */
    async deleteGradientSwatch(id) {
      await deleteGradientSwatch(id);
      await get().loadGradientSwatches();
    },

    /** Toggle favorite */
    async toggleGradientFavorite(swatch) {
      await saveGradientSwatch({ ...swatch, isFavorite: !swatch.isFavorite });
      await get().loadGradientSwatches();
    },

    /** Set active category */
    setGradientSwatchCategory(cat) {
      set(state => { state.gradientSwatchCategory = cat; });
    },

    /** Load saved colors from DB */
    async loadSavedColors() {
      const colors = await getColorSwatches();
      set(state => { state.savedColors = colors; });
    },

    /** Save a color */
    async saveColor(color, name = 'Color') {
      await saveColorSwatch({ color, name, category: 'Saved' });
      await get().loadSavedColors();
    },
  }))
);

function colorToHexStr(c) {
  if (!c) return '';
  const r = Math.round(c.r).toString(16).padStart(2,'0');
  const g = Math.round(c.g).toString(16).padStart(2,'0');
  const b = Math.round(c.b).toString(16).padStart(2,'0');
  return `#${r}${g}${b}`;
}
