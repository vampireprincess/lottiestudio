import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';
import { db, saveAsset, getAssets, deleteAsset } from '../../db/index.js';
import { Image, Film, Grid, List, Star, Clock, Search, Plus, Trash2, Edit3, Copy, Upload, FolderOpen, Download } from 'lucide-react';

export function AssetLibrary() {
  const { openModal, importSVG } = useEditorStore();
  const [assets, setAssets] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const all = await getAssets();
      setAssets(all);
    } catch (err) { console.warn(err); }
    finally { setLoading(false); }
  };

  const filtered = assets.filter(a => {
    const typeOk = activeType === 'all' || a.type === activeType || (activeType === 'favorites' && a.isFavorite);
    const searchOk = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return typeOk && searchOk;
  });

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,.json,.lottie,.png,.jpg,.jpeg,.gif,.webp';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (re) => {
          const content = re.target?.result;
          const type = file.name.endsWith('.svg') ? 'svg'
            : (file.name.endsWith('.json') || file.name.endsWith('.lottie')) ? 'lottie'
            : 'image';

          await saveAsset({
            name: file.name.replace(/\.[^/.]+$/, ''),
            type,
            category: 'Imported',
            tags: [],
            isFavorite: false,
            content: type !== 'image' ? content : null,
            dataUrl: type === 'image' ? content : null,
            fileSize: file.size,
          });
          loadAssets();
        };
        if (file.name.endsWith('.svg') || file.name.endsWith('.json') || file.name.endsWith('.lottie')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleUseAsset = (asset) => {
    if (asset.type === 'svg' && asset.content) {
      importSVG(asset.content, { name: asset.name });
    } else if (asset.type === 'lottie' && asset.content) {
      openModal('importLottie');
    }
  };

  // "Show in Workspace" — downloads a copy of the asset
  // Note: true OS-level file reveal is only possible via Tauri (planned migration)
  const handleRevealAsset = (asset) => {
    const content = asset.content || asset.dataUrl;
    if (!content) return;
    const ext = asset.type === 'svg' ? '.svg' : asset.type === 'lottie' ? '.json' : '.png';
    const mimeType = asset.type === 'svg' ? 'image/svg+xml'
      : asset.type === 'lottie' ? 'application/json'
      : 'image/png';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (asset.name || 'asset') + ext;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDuplicateAsset = async (asset) => {
    const copy = {
      ...asset,
      id: undefined,
      name: asset.name + ' Copy',
    };
    await saveAsset(copy);
    loadAssets();
  };

  // Rename — called with new name from inline editor in AssetCard
  const handleRenameAsset = async (asset, newName) => {
    if (!newName || newName === asset.name) return;
    await saveAsset({ ...asset, name: newName });
    loadAssets();
  };

  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteAsset = async (id) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteAsset(deletingId);
      await loadAssets();
    }
    setDeletingId(null);
  };

  const toggleFavorite = async (asset) => {
    await saveAsset({ ...asset, isFavorite: !asset.isFavorite });
    loadAssets();
  };

  const TYPES = [
    { id:'all', label:'All', icon: Grid },
    { id:'svg', label:'SVG', icon: Image },
    { id:'lottie', label:'Lottie', icon: Film },
    { id:'image', label:'Images', icon: Image },
    { id:'favorites', label:'Favorites', icon: Star },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#16161a' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e3a] flex-shrink-0">
        <span className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider">Asset Library</span>
        <div className="flex items-center gap-1">
          <button className={`btn-icon w-6 h-6 ${viewMode==='grid'?'active':''}`} onClick={() => setViewMode('grid')}><Grid size={11}/></button>
          <button className={`btn-icon w-6 h-6 ${viewMode==='list'?'active':''}`} onClick={() => setViewMode('list')}><List size={11}/></button>
          <button className="btn-icon w-6 h-6" onClick={handleImport} title="Import files"><Plus size={12}/></button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#2e2e3a] flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#22222a] rounded px-2 py-1">
          <Search size={11} className="text-[#5a5a70]"/>
          <input type="text" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#f0f0f5] placeholder-[#5a5a70] outline-none"/>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex border-b border-[#2e2e3a] flex-shrink-0 overflow-x-auto">
        {TYPES.map(t => (
          <button key={t.id}
            className={`flex-1 flex flex-col items-center py-1.5 text-2xs whitespace-nowrap transition-colors min-w-[40px] ${activeType===t.id?'text-[#a08fff] border-b-2 border-[#7b68ee]':'text-[#5a5a70] hover:text-[#9090a8]'}`}
            onClick={() => setActiveType(t.id)}
          >
            <t.icon size={12}/>
            <span className="mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Delete confirmation */}
      {deletingId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f04060]/10 border-b border-[#f04060]/30 flex-shrink-0">
          <span className="text-xs text-[#f04060] flex-1">Delete this asset?</span>
          <button className="px-2 py-0.5 text-2xs font-semibold rounded bg-[#f04060] text-white" onClick={confirmDelete}>Delete</button>
          <button className="px-2 py-0.5 text-2xs rounded border border-[#3a3a50] text-[#9090a8]" onClick={() => setDeletingId(null)}>Cancel</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <div className="text-center py-8 text-xs text-[#5a5a70]">Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Upload size={28} className="text-[#3a3a50]"/>
            <div>
              <p className="text-xs text-[#5a5a70]">No assets yet</p>
              <p className="text-2xs text-[#3a3a50] mt-0.5">Import SVG or Lottie files to build your library</p>
            </div>
            <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1" onClick={handleImport}>
              <Plus size={11}/> Import Files
            </button>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(asset => (
              <AssetCard key={asset.id} asset={asset}
                onUse={() => handleUseAsset(asset)}
                onDelete={() => handleDeleteAsset(asset.id)}
                onFavorite={() => toggleFavorite(asset)}
                onDuplicate={() => handleDuplicateAsset(asset)}
                onRename={(newName) => handleRenameAsset(asset, newName)}
                onReveal={() => handleRevealAsset(asset)}
              />
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-1">
            {filtered.map(asset => (
              <AssetListRow key={asset.id} asset={asset}
                onUse={() => handleUseAsset(asset)}
                onDelete={() => handleDeleteAsset(asset.id)}
                onFavorite={() => toggleFavorite(asset)}
                onDuplicate={() => handleDuplicateAsset(asset)}
                onRename={(newName) => handleRenameAsset(asset, newName)}
                onReveal={() => handleRevealAsset(asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset, onUse, onDelete, onFavorite, onDuplicate, onRename, onReveal }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(asset.name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditVal(asset.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 40);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== asset.name && onRename) onRename(trimmed);
  };

  return (
    <div
      className="group relative rounded border border-[#2e2e3a] hover:border-[#7b68ee]/40 transition-colors overflow-hidden cursor-pointer"
      onClick={editing ? undefined : onUse}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/lottie-studio-asset', JSON.stringify({ id: asset.id, type: asset.type, name: asset.name }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={`${asset.name} · ${asset.type} · Drag to canvas`}
    >
      {/* Thumbnail */}
      <div className="aspect-square flex items-center justify-center bg-[#22222a] relative">
        {asset.dataUrl ? (
          <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-contain"/>
        ) : asset.type === 'svg' && asset.content ? (
          <div className="w-full h-full p-1 overflow-hidden" style={{ opacity: 0.8 }}
            dangerouslySetInnerHTML={{ __html: asset.content.replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%">') }}/>
        ) : asset.type === 'svg' ? (
          <Image size={24} className="text-[#5a5a70]"/>
        ) : (
          <Film size={24} className="text-[#5a5a70]"/>
        )}
        {/* Drag hint */}
        <div className="absolute inset-0 bg-[#7b68ee]/0 group-hover:bg-[#7b68ee]/8 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-2xs text-[#a08fff] bg-[#1a1a22]/80 px-1 rounded">Click/Drag</span>
        </div>
      </div>

      {/* Name — inline editable on double-click */}
      <div className="px-1.5 py-1">
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
              e.stopPropagation();
            }}
            onClick={e => e.stopPropagation()}
            className="w-full text-2xs bg-[#22222a] border border-[#7b68ee] rounded px-1 outline-none text-[#f0f0f5]"
            autoFocus
          />
        ) : (
          <p className="text-2xs text-[#b0b0c0] truncate" onDoubleClick={startEdit} title="Double-click to rename">
            {asset.name}
          </p>
        )}
        <p className="text-2xs text-[#5a5a70]">{asset.type}</p>
      </div>

      {/* Hover controls */}
      <div className="absolute top-1 right-1 hidden group-hover:flex flex-col gap-0.5">
        <button className={`w-5 h-5 rounded flex items-center justify-center bg-[#0a0a10]/80 ${asset.isFavorite?'text-yellow-400':'text-[#5a5a70]'}`}
          onClick={e => { e.stopPropagation(); onFavorite(); }}>
          <Star size={9}/>
        </button>
        <button className="w-5 h-5 rounded flex items-center justify-center bg-[#0a0a10]/80 text-[#9090a8] hover:text-[#f0f0f5]"
          onClick={startEdit} title="Rename (or double-click name)">
          <Edit3 size={9}/>
        </button>
        <button className="w-5 h-5 rounded flex items-center justify-center bg-[#0a0a10]/80 text-[#9090a8] hover:text-[#f0f0f5]"
          onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">
          <Copy size={9}/>
        </button>
        <button className="w-5 h-5 rounded flex items-center justify-center bg-[#0a0a10]/80 text-[#9090a8] hover:text-[#30a0f0]"
          onClick={e => { e.stopPropagation(); onReveal && onReveal(); }} title="Download / Export copy">
          <Download size={9}/>
        </button>
        <button className="w-5 h-5 rounded flex items-center justify-center bg-[#0a0a10]/80 text-[#f04060]"
          onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete">
          <Trash2 size={9}/>
        </button>
      </div>
    </div>
  );
}

function AssetListRow({ asset, onUse, onDelete, onFavorite, onDuplicate, onRename, onReveal }) {
  const Icon = asset.type === 'svg' ? Image : Film;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(asset.name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditVal(asset.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 40);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== asset.name && onRename) onRename(trimmed);
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent hover:border-[#2e2e3a] hover:bg-[#22222a] cursor-pointer group"
      onClick={editing ? undefined : onUse}
      draggable={!editing}
      onDragStart={e => {
        e.dataTransfer.setData('application/lottie-studio-asset', JSON.stringify({ id: asset.id, type: asset.type, name: asset.name }));
        e.dataTransfer.effectAllowed = 'copy';
      }}>
      <Icon size={14} className="text-[#5a5a70] flex-shrink-0"/>
      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
            e.stopPropagation();
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-xs bg-[#22222a] border border-[#7b68ee] rounded px-1 outline-none text-[#f0f0f5]"
          autoFocus
        />
      ) : (
        <span className="text-xs text-[#b0b0c0] flex-1 truncate" onDoubleClick={startEdit} title="Double-click to rename">{asset.name}</span>
      )}
      <span className="text-2xs text-[#5a5a70]">{asset.type}</span>
      <div className="hidden group-hover:flex items-center gap-1">
        <button className={`btn-icon w-5 h-5 ${asset.isFavorite?'text-yellow-400':'text-[#5a5a70]'}`}
          onClick={e=>{e.stopPropagation();onFavorite();}} title="Favorite"><Star size={10}/></button>
        <button className="btn-icon w-5 h-5 text-[#9090a8]" onClick={startEdit} title="Rename (or double-click)"><Edit3 size={10}/></button>
        <button className="btn-icon w-5 h-5 text-[#9090a8]" onClick={e=>{e.stopPropagation();onDuplicate();}} title="Duplicate"><Copy size={10}/></button>
        <button className="btn-icon w-5 h-5 text-[#9090a8]" onClick={e=>{e.stopPropagation();onReveal&&onReveal();}} title="Download copy"><Download size={10}/></button>
        <button className="btn-icon w-5 h-5 text-[#f04060]" onClick={e=>{e.stopPropagation();onDelete();}} title="Delete"><Trash2 size={10}/></button>
      </div>
    </div>
  );
}
