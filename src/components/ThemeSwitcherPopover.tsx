import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Palette, Search, X } from 'lucide-react';
import { ThemeId } from '../types/platform';
import { THEME_OPTIONS, ThemeOptionMeta } from '../utils/storage';

interface ThemeSwitcherPopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeTheme: ThemeId;
  previewTheme: ThemeId | null;
  onPreviewTheme: (themeId: ThemeId | null) => void;
  onSelectTheme: (themeId: ThemeId) => void;
}

type ThemeModeFilter = 'all' | 'dark' | 'light';

export const ThemeSwitcherPopover: React.FC<ThemeSwitcherPopoverProps> = ({
  isOpen,
  onToggle,
  onClose,
  activeTheme,
  previewTheme,
  onPreviewTheme,
  onSelectTheme,
}) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ThemeModeFilter>('all');

  const darkCount = useMemo(
    () => THEME_OPTIONS.filter((t) => t.isDark).length,
    []
  );
  const lightCount = THEME_OPTIONS.length - darkCount;

  const activeMeta: ThemeOptionMeta = useMemo(
    () =>
      THEME_OPTIONS.find((t) => t.id === (previewTheme || activeTheme)) ||
      THEME_OPTIONS[0],
    [activeTheme, previewTheme]
  );

  const lockedMeta: ThemeOptionMeta = useMemo(
    () => THEME_OPTIONS.find((t) => t.id === activeTheme) || THEME_OPTIONS[0],
    [activeTheme]
  );

  const filteredThemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return THEME_OPTIONS.filter((t) => {
      if (modeFilter === 'dark' && !t.isDark) return false;
      if (modeFilter === 'light' && t.isDark) return false;
      if (!q) return true;
      return `${t.name} ${t.tag} ${t.isDark ? 'dark' : 'light'}`
        .toLowerCase()
        .includes(q);
    });
  }, [search, modeFilter]);

  const handleClose = () => {
    onPreviewTheme(null);
    onClose();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            onPreviewTheme(null);
          }
          onToggle();
        }}
        aria-label="Select Color Theme"
        aria-expanded={isOpen}
        title={`Theme: ${lockedMeta.name}`}
        className="btn-tactile px-2.5 py-2 rounded-lg border border-subtle bg-card hover:border-accent text-xs font-bold flex items-center gap-1.5 text-primary whitespace-nowrap shrink-0"
      >
        {/* 3-color live swatch preview */}
        <span className="flex items-center -space-x-1 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-subtle"
            style={{ backgroundColor: activeMeta.canvas }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-subtle"
            style={{ backgroundColor: activeMeta.card }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/25 dark:border-white/30"
            style={{ backgroundColor: activeMeta.accent }}
          />
        </span>
        <Palette className="w-3.5 h-3.5 text-accent hidden sm:inline shrink-0" />
        <span>🎨 Theme ({THEME_OPTIONS.length})</span>
        <ChevronDown className="w-3 h-3 text-muted shrink-0" />
      </button>

      {isOpen && (
        <div
          onMouseLeave={() => onPreviewTheme(null)}
          className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-24px)] max-h-[78vh] flex flex-col rounded-xl border border-subtle bg-canvas shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-subtle bg-card flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold text-primary whitespace-nowrap">
              Theme Engine ({THEME_OPTIONS.length})
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              {previewTheme && previewTheme !== activeTheme && (
                <span className="text-[10px] font-medium text-muted shrink-0">
                  Preview:
                </span>
              )}
              <span className="text-[11px] font-semibold text-accent truncate">
                {activeMeta.name}
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close theme switcher"
                className="p-0.5 rounded text-muted hover:text-primary shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Mode Filter Tabs */}
          <div className="p-2.5 border-b border-subtle bg-card/60 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Filter ${THEME_OPTIONS.length} themes...`}
                aria-label="Filter themes"
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-subtle bg-canvas text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear theme search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-subtle bg-canvas">
              {(
                [
                  { id: 'all', label: `All (${THEME_OPTIONS.length})` },
                  { id: 'dark', label: `Dark (${darkCount})` },
                  { id: 'light', label: `Light (${lightCount})` },
                ] as const
              ).map((tab) => {
                const active = modeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModeFilter(tab.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap tabular-nums ${
                      active
                        ? 'bg-accent text-accent-contrast shadow-xs'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Visual Swatch Grid */}
          <div className="overflow-y-auto p-2.5">
            {filteredThemes.length === 0 ? (
              <div className="py-8 px-3 text-center text-xs text-muted">
                No themes match &ldquo;{search}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredThemes.map((t) => {
                  const selected = t.id === activeTheme;
                  const isPreviewed = t.id === previewTheme;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onMouseEnter={() => onPreviewTheme(t.id)}
                      onFocus={() => onPreviewTheme(t.id)}
                      onClick={() => {
                        onPreviewTheme(null);
                        onSelectTheme(t.id);
                        onClose();
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                        selected
                          ? 'bg-accent/15 border-accent text-primary ring-1 ring-accent/35'
                          : isPreviewed
                          ? 'bg-elevated border-accent/60 text-primary'
                          : 'bg-card border-subtle text-primary hover:bg-elevated hover:border-accent/50'
                      }`}
                    >
                      {/* Top row: 3-color mini palette preview + active checkmark */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div
                          className="flex items-center gap-1 p-1 rounded-lg border border-black/10 dark:border-white/10"
                          style={{ backgroundColor: t.canvas }}
                          title={`Canvas ${t.canvas} · Card ${t.card} · Accent ${t.accent}`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/25 dark:border-white/20"
                            style={{ backgroundColor: t.canvas }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20"
                            style={{ backgroundColor: t.card }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/25"
                            style={{ backgroundColor: t.accent }}
                          />
                        </div>

                        {selected ? (
                          <span className="w-5 h-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted shrink-0">
                            {t.isDark ? 'Dark' : 'Light'}
                          </span>
                        )}
                      </div>

                      {/* Theme Name & Tag */}
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-tight">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-muted truncate mt-0.5">
                          {t.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
