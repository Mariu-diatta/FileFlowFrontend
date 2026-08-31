import { useRef, useState } from "react";
import { Eraser, Palette, Pencil, Trash2, Smile, ImagePlus, Video, X, Sparkles, Play, Pause } from "lucide-react";
import { useCampaignStore } from "../../stores/campaignStore";
import { MediaOverlayLayer, MediaOverlaysPanel } from "./MediaOverlayLayer";
import { TimeField, formatTime } from "./TimeField";

const PLATFORM_LABELS = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts",
  linkedin: "LinkedIn", facebook: "Facebook", x: "X (Twitter)",
};

// Dimensions réelles par plateforme (utilisées pour la résolution du canvas
// de dessin, afin que le dessin exporté corresponde pixel pour pixel à la
// vidéo finale — voir repost/pipeline.py côté serveur, filtre "overlay").
const PLATFORM_DIMENSIONS = {
  tiktok: { width: 1080, height: 1920 },
  instagram: { width: 1080, height: 1920 },
  youtube: { width: 1080, height: 1920 },
  linkedin: { width: 1920, height: 1080 },
  facebook: { width: 1280, height: 720 },
  x: { width: 1280, height: 720 },
};

// Filtres couleur classiques : appliqués réellement côté serveur via ffmpeg
// (voir repost/pipeline.py COLOR_FILTERS). L'aperçu CSS ci-dessous est une
// approximation visuelle, pas le rendu pixel-perfect final.
const FILTERS = [
  { id: "none", label: "Aucun", css: "none" },
  { id: "noir_blanc", label: "Noir & blanc", css: "grayscale(1)" },
  { id: "sepia", label: "Sépia", css: "sepia(0.8)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.35) contrast(0.9) brightness(1.05) saturate(0.8)" },
  { id: "contraste", label: "Contraste +", css: "contrast(1.35) brightness(1.02)" },
  { id: "chaud", label: "Ton chaud", css: "sepia(0.15) saturate(1.2) hue-rotate(-8deg)" },
  { id: "froid", label: "Ton froid", css: "saturate(1.1) hue-rotate(8deg) brightness(1.02)" },
];

// Effets exclusifs : combinaisons de filtres ffmpeg (rgbashift, edgedetect,
// pixelisation par ré-échantillonnage "neighbor", courbes par canal...)
// qu'on ne trouve pas dans l'appareil photo d'un téléphone ni dans les
// filtres standards des autres apps. Rendu réel généré côté serveur ;
// l'aperçu CSS ci-dessous n'est qu'une approximation.
const EFFECTS = [
  { id: "glitch_rgb", label: "Glitch RGB", css: "contrast(1.15) saturate(1.5) hue-rotate(-12deg)", exclusive: true },
  { id: "vhs_retro", label: "VHS rétro", css: "contrast(0.9) saturate(0.65) sepia(0.2) brightness(1.05)", exclusive: true },
  { id: "neon_edge", label: "Contour néon", css: "brightness(0.55) contrast(3) saturate(2.4) hue-rotate(190deg)", exclusive: true },
  { id: "pixel_art", label: "Pixel art", css: "contrast(1.25) saturate(1.35)", exclusive: true },
  { id: "negatif_lumineux", label: "Négatif lumineux", css: "invert(0.85) hue-rotate(180deg) contrast(1.1)", exclusive: true },
  { id: "infrarouge", label: "Vision infrarouge", css: "grayscale(1) sepia(1) hue-rotate(210deg) saturate(6) contrast(1.15)", exclusive: true },
];

const ALL_FILTERS = [...FILTERS, ...EFFECTS];

const BRUSH_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff", "#000000"];

const QUICK_EMOJIS = ["😀", "😂", "❤️", "🔥", "⭐", "🎉", "👍", "😍", "💯", "✨", "😎", "👏"];

const POSITION_PRESETS = [
  { id: "top_left", label: "Haut gauche", x: 0.08, y: 0.08 },
  { id: "top_right", label: "Haut droite", x: 0.62, y: 0.08 },
  { id: "center", label: "Centre", x: 0.35, y: 0.45 },
  { id: "bottom_left", label: "Bas gauche", x: 0.08, y: 0.75 },
  { id: "bottom_right", label: "Bas droite", x: 0.62, y: 0.75 },
];

const STICKER_TYPES = [
  { id: "butterfly", label: "Papillon qui vole", icon: "/stickers/butterfly.png" },
  { id: "flower", label: "Fleur qui bouge", icon: "/stickers/flower.png" },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Composeur : trait libre au pinceau (aplati en PNG transparent, voir
// api/repost.js overlay_<platform>) + ajout d'émojis/photos sous forme de
// calques indépendants, déplaçables et redimensionnables par leurs bords
// directement sur l'aperçu (voir MediaOverlayLayer).
function OverlayComposer({ platform, dims, containerRef, selectedMediaId, setSelectedMediaId }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState("pen"); // "pen" | "eraser" | "emoji" | "photo"
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
  const {
    setPlatformOverlay, clearPlatformOverlay,
    getPlatformOption, addMediaOverlay, updateMediaOverlay, removeMediaOverlay,
  } = useCampaignStore();
  const current = getPlatformOption(platform);
  const mediaOverlays = current.mediaOverlays || [];

  const isStrokeMode = (m) => m === "pen" || m === "eraser";

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const exportOverlay = () => {
    const canvas = canvasRef.current;
    setPlatformOverlay(platform, canvas.toDataURL("image/png"));
  };

  const startDraw = (e) => {
    if (!isStrokeMode(mode)) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const draw = (e) => {
    if (!isStrokeMode(mode) || !drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize * (canvasRef.current.width / canvasRef.current.getBoundingClientRect().width);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isStrokeMode(mode) || !drawing.current) return;
    drawing.current = false;
    exportOverlay();
  };

  const handleClear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    clearPlatformOverlay(platform);
  };

  // Ajouter un émoji : crée tout de suite un calque déplaçable/redimensionnable
  // centré sur l'aperçu — plus de "tamponnage" figé, on ajuste après coup en
  // glissant l'élément ou ses poignées.
  const handleAddEmoji = (emoji) => {
    const id = `emoji_${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    const size = 0.16;
    addMediaOverlay(platform, {
      id, kind: "emoji", content: emoji,
      x: 0.5 - size / 2, y: 0.5 - size / 2, width: size, height: size,
      start: 0, end: null,
    });
    setSelectedMediaId(id);
  };

  // Ajouter une photo : même principe, taille de départ calculée depuis le
  // ratio naturel de l'image pour ne pas la déformer, puis ajustable par
  // les poignées.
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const img = new Image();
    img.onload = () => {
      const width = 0.32;
      const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
      const height = Math.min(0.7, width * ratio * (dims.width / dims.height));
      const id = `photo_${Date.now()}_${Math.round(Math.random() * 1e4)}`;
      addMediaOverlay(platform, {
        id, kind: "photo", content: dataUrl,
        x: 0.5 - width / 2, y: 0.5 - height / 2, width, height,
        start: 0, end: null,
      });
      setSelectedMediaId(id);
    };
    img.src = dataUrl;
    e.target.value = "";
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className={`absolute inset-0 w-full h-full touch-none ${
          mode === "pen" ? "cursor-crosshair" : mode === "eraser" ? "cursor-cell" : ""
        }`}
        style={{ pointerEvents: isStrokeMode(mode) ? "auto" : "none" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      <MediaOverlayLayer
        items={mediaOverlays}
        mode="edit"
        interactive={!isStrokeMode(mode)}
        containerRef={containerRef}
        selectedId={selectedMediaId}
        onSelect={setSelectedMediaId}
        onChange={(id, patch) => updateMediaOverlay(platform, id, patch)}
        onRemove={(id) => { removeMediaOverlay(platform, id); if (selectedMediaId === id) setSelectedMediaId(null); }}
      />

      {/* Sélecteur de mode */}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded-lg px-1.5 py-1 z-30">
        <button type="button" onClick={() => setMode("pen")} title="Dessiner"
          className={`p-1.5 rounded ${mode === "pen" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={() => setMode("eraser")} title="Gomme"
          className={`p-1.5 rounded ${mode === "eraser" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <Eraser size={14} />
        </button>
        <button type="button" onClick={() => setMode("emoji")} title="Émoji"
          className={`p-1.5 rounded ${mode === "emoji" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <Smile size={14} />
        </button>
        <label title="Photo" className={`p-1.5 rounded cursor-pointer ${mode === "photo" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <ImagePlus size={14} />
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => { setMode("photo"); handlePhotoChange(e); }}
          />
        </label>
        {isStrokeMode(mode) && (
          <>
            <div className="flex-1" />
            <input
              type="range" min={2} max={40} value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-14"
              aria-label={mode === "eraser" ? "Taille de la gomme" : "Épaisseur du trait"}
              title={mode === "eraser" ? "Taille de la gomme" : "Épaisseur du trait"}
            />
          </>
        )}
      </div>

      {/* Sélecteur d'émojis rapides — ligne qui défile horizontalement */}
      {mode === "emoji" && (
        <div className="absolute top-11 left-2 right-2 flex items-center gap-1 overflow-x-auto no-scrollbar bg-black/50 backdrop-blur rounded-lg px-1.5 py-1 z-30">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em} type="button" onClick={() => handleAddEmoji(em)}
              className="text-base leading-none w-7 h-7 shrink-0 flex items-center justify-center rounded hover:bg-white/20"
              title="Ajouter cet émoji"
            >
              {em}
            </button>
          ))}
        </div>
      )}
      {mode === "photo" && (
        <div className="absolute top-11 left-2 right-2 text-[11px] text-white bg-black/50 backdrop-blur rounded-lg px-2 py-1.5 z-30">
          Choisis une photo : elle apparaît au centre, glisse-la ou tire ses bords pour l'ajuster.
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 bg-black/50 backdrop-blur rounded-lg px-2 py-1.5 z-30">
        {mode === "pen" ? (
          <div className="flex items-center gap-1">
            {BRUSH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        ) : mode === "eraser" ? (
          <span className="text-[11px] text-white/80">Passe sur le dessin pour gommer</span>
        ) : (
          <span className="text-[11px] text-white/80">Glisse un élément pour le déplacer, tire ses bords pour le redimensionner</span>
        )}
        <button
          type="button"
          onClick={handleClear}
          title="Effacer le dessin au pinceau"
          className="text-white/90 hover:text-white flex items-center gap-1 text-xs shrink-0"
        >
          <Trash2 size={14} /> Effacer le trait
        </button>
      </div>
    </>
  );
}

// --- Vidéo superposée (PiP / écran partagé / comparateur avant-après) -----
const PIP_SIZES = [
  { id: "small", label: "Petit", width_ratio: 0.25 },
  { id: "medium", label: "Moyen", width_ratio: 0.35 },
  { id: "large", label: "Grand", width_ratio: 0.5 },
];

// Dispositions possibles pour la 2ᵉ vidéo (voir repost/pipeline.py côté
// serveur, qui fait tout le travail ffmpeg). Aucune ne nécessite d'IA.
const LAYOUTS = [
  { id: "pip", label: "Incrustation (PiP)", hint: "Une petite vidéo flottante par-dessus l'autre." },
  { id: "side_by_side", label: "Côte à côte", hint: "Les deux vidéos, gauche / droite, à parts égales." },
  { id: "top_bottom", label: "Haut / bas", hint: "Les deux vidéos, empilées à parts égales." },
  { id: "compare_h", label: "Avant / après ↔", hint: "Un trait balaie l'écran horizontalement pour révéler la 2ᵉ vidéo." },
  { id: "compare_v", label: "Avant / après ↕", hint: "Un trait balaie l'écran verticalement pour révéler la 2ᵉ vidéo." },
];

const DEFAULT_VIDEO_OVERLAY_CONFIG = { layout: "pip", x: 0.6, y: 0.05, width_ratio: 0.35, start: 0, end: null };

function VideoOverlayPanel({ platform, currentTime, onSeek }) {
  const { getPlatformOption, setVideoOverlayFile, setVideoOverlayConfig, clearVideoOverlay } = useCampaignStore();
  const current = getPlatformOption(platform);
  const cfg = current.videoOverlayConfig || DEFAULT_VIDEO_OVERLAY_CONFIG;
  const layout = LAYOUTS.find((l) => l.id === cfg.layout) || LAYOUTS[0];

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoOverlayFile(platform, file, URL.createObjectURL(file));
  };

  const activePreset = POSITION_PRESETS.find((p) => Math.abs(p.x - cfg.x) < 0.01 && Math.abs(p.y - cfg.y) < 0.01);
  const activeSize = PIP_SIZES.find((s) => Math.abs(s.width_ratio - cfg.width_ratio) < 0.01) || PIP_SIZES[1];

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
          <Video size={13} /> Vidéo superposée
        </span>
        {current.videoOverlayFile ? (
          <button type="button" onClick={() => clearVideoOverlay(platform)} className="text-gray-400 hover:text-red-500">
            <X size={13} />
          </button>
        ) : (
          <label className="text-xs text-blue-600 hover:underline cursor-pointer">
            Ajouter
            <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>

      {current.videoOverlayFile && (
        <div className="mt-1.5 space-y-1.5">
          <select
            value={layout.id}
            onChange={(e) => setVideoOverlayConfig(platform, { layout: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 w-full"
          >
            {LAYOUTS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400">{layout.hint}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {layout.id === "pip" && (
              <>
                <select
                  value={activePreset?.id || "top_right"}
                  onChange={(e) => {
                    const preset = POSITION_PRESETS.find((p) => p.id === e.target.value);
                    if (preset) setVideoOverlayConfig(platform, { x: preset.x, y: preset.y });
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-1.5 py-1"
                >
                  {POSITION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={activeSize.id}
                  onChange={(e) => {
                    const size = PIP_SIZES.find((s) => s.id === e.target.value);
                    if (size) setVideoOverlayConfig(platform, { width_ratio: size.width_ratio });
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-1.5 py-1"
                >
                  {PIP_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </>
            )}
            <TimeField
              label="Apparaît à" value={cfg.start} currentTime={currentTime} onSeek={onSeek}
              onChange={(v) => setVideoOverlayConfig(platform, { start: v ?? 0 })}
            />
            <TimeField
              label="Disparaît à" value={cfg.end} currentTime={currentTime} onSeek={onSeek}
              allowEmpty placeholder="fin"
              onChange={(v) => setVideoOverlayConfig(platform, { end: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stickers animés (fleur qui bouge, papillon qui vole) ------------------
function AnimatedStickersPanel({ platform, currentTime, onSeek }) {
  const { getPlatformOption, addAnimatedSticker, updateAnimatedSticker, removeAnimatedSticker } = useCampaignStore();
  const current = getPlatformOption(platform);
  const stickers = current.animatedStickers || [];

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <span className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1.5">
        <Sparkles size={13} /> Éléments animés
      </span>
      <div className="flex items-center gap-1.5 mb-1.5">
        {STICKER_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => addAnimatedSticker(platform, { type: s.id, start: 0, duration: 4, size: 0.2, x: 0.5, y: 0.5 })}
            disabled={stickers.length >= 6}
            className="flex items-center gap-1 text-xs border border-gray-200 rounded-full pl-1 pr-2 py-1 hover:border-blue-300 disabled:opacity-40"
          >
            <img src={s.icon} alt="" className="w-4 h-4" /> + {s.label}
          </button>
        ))}
      </div>

      {stickers.map((sticker, i) => {
        const meta = STICKER_TYPES.find((s) => s.id === sticker.type);
        const preset = POSITION_PRESETS.find((p) => Math.abs(p.x - sticker.x) < 0.02 && Math.abs(p.y - sticker.y) < 0.02);
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 mb-1">
            <img src={meta?.icon} alt="" className="w-4 h-4 shrink-0" />
            <select
              value={preset?.id || "center"}
              onChange={(e) => {
                const p = POSITION_PRESETS.find((p) => p.id === e.target.value);
                if (p) updateAnimatedSticker(platform, i, { x: p.x, y: p.y });
              }}
              className="text-xs border border-gray-200 rounded-lg px-1 py-0.5"
            >
              {POSITION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <TimeField
              label="Départ" value={sticker.start} currentTime={currentTime} onSeek={onSeek}
              onChange={(v) => updateAnimatedSticker(platform, i, { start: v ?? 0 })}
            />
            <label className="text-[11px] text-gray-500 flex items-center gap-0.5">
              Durée
              <input
                type="number" min={0.5} step={0.5} value={sticker.duration}
                onChange={(e) => updateAnimatedSticker(platform, i, { duration: Math.max(0.5, Number(e.target.value)) })}
                className="w-12 text-xs border border-gray-200 rounded-lg px-1 py-0.5"
              />s
            </label>
            <button type="button" onClick={() => removeAnimatedSticker(platform, i)} className="ml-auto text-gray-400 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// --- Ligne de filtres/effets qui défile horizontalement (au lieu de tout
// afficher en vrac sur plusieurs lignes) ------------------------------------
function FilterRow({ title, icon, items, activeId, onSelect }) {
  return (
    <div className="mt-1.5">
      {title && (
        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mb-1">
          {icon} {title}
        </span>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-0.5">
        {items.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            title={f.exclusive ? "Effet exclusif — indisponible sur l'appareil photo d'un téléphone" : undefined}
            className={`shrink-0 snap-start text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 whitespace-nowrap ${
              activeId === f.id || (!activeId && f.id === "none")
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : f.exclusive
                ? "border-purple-200 text-purple-700 hover:border-purple-300 bg-purple-50/40"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.exclusive && <Sparkles size={11} />}
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ platform, sourceUrl }) {
  const dims = PLATFORM_DIMENSIONS[platform] || { width: 1080, height: 1920 };
  const ratio = dims.width > dims.height ? "16 / 9" : "9 / 16";
  const { getPlatformOption, setPlatformFilter, updateMediaOverlay, removeMediaOverlay, clipStart, clipEnd } = useCampaignStore();
  const [showDrawing, setShowDrawing] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0); // secondes depuis le DÉBUT DE L'EXTRAIT (pas du fichier source)
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const current = getPlatformOption(platform);
  const activeFilter = ALL_FILTERS.find((f) => f.id === current.filter) || FILTERS[0];
  const mediaOverlays = current.mediaOverlays || [];
  const clipDuration = Math.max(0.1, (clipEnd ?? 15) - (clipStart ?? 0));

  // La vidéo de l'aperçu correspond au fichier source complet, mais tous les
  // réglages d'apparition/disparition (émojis, photos, vidéo incrustée,
  // stickers animés) sont exprimés en secondes depuis le DÉBUT DE L'EXTRAIT
  // choisi dans "Découpe" — exactement comme le fera le rendu final envoyé
  // aux réseaux sociaux (voir repost/pipeline.py). On rejoue donc ici en
  // boucle uniquement la portion [clipStart, clipEnd], pour que le temps
  // affiché et les boutons "utiliser l'instant actuel" collent au montage
  // réel plutôt qu'à la vidéo brute.
  const handleLoadedMetadata = () => {
    if (videoRef.current) videoRef.current.currentTime = clipStart || 0;
  };

  const syncFromVideo = (t) => {
    setCurrentTime(Math.max(0, Math.round((t - (clipStart || 0)) * 10) / 10));
  };

  const handleTimeUpdate = (e) => {
    const v = e.currentTarget;
    if (v.currentTime < (clipStart || 0) || v.currentTime >= (clipEnd ?? v.duration)) {
      v.currentTime = clipStart || 0;
    }
    syncFromVideo(v.currentTime);
  };

  const handleSeek = (relativeSeconds) => {
    const v = videoRef.current;
    if (!v) return;
    const t = (clipStart || 0) + Math.min(Math.max(0, relativeSeconds), clipDuration);
    v.currentTime = t;
    syncFromVideo(t);
    v.play();
    setIsPlaying(true);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); } else { v.pause(); setIsPlaying(false); }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-sm">{PLATFORM_LABELS[platform] || platform}</strong>
        <button
          type="button"
          onClick={() => { setShowDrawing((v) => !v); setSelectedMediaId(null); }}
          title={showDrawing ? "Terminer l'édition" : "Dessin / émoji / photo"}
          className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap ${
            showDrawing ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Pencil size={12} className="shrink-0" /> {showDrawing ? "Terminer" : "Éditer"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: ratio, maxWidth: dims.width > dims.height ? "100%" : 220 }}
      >
        {sourceUrl && (
          <video
            ref={videoRef}
            src={sourceUrl}
            muted
            autoPlay
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: activeFilter.css }}
          />
        )}
        {/* Aperçu statique de la vidéo superposée — approximatif : la
            disposition réelle (écran partagé, comparateur animé) et le
            passage exact par start/end sont calculés côté serveur par
            ffmpeg, voir repost/pipeline.py. */}
        {!showDrawing && current.videoOverlayUrl && current.videoOverlayConfig && (() => {
          const layout = current.videoOverlayConfig.layout || "pip";
          if (layout === "pip") {
            return (
              <video
                src={current.videoOverlayUrl}
                muted loop autoPlay playsInline
                className="absolute rounded shadow-lg ring-1 ring-white/40 object-cover"
                style={{
                  left: `${current.videoOverlayConfig.x * 100}%`,
                  top: `${current.videoOverlayConfig.y * 100}%`,
                  width: `${current.videoOverlayConfig.width_ratio * 100}%`,
                  aspectRatio: "16 / 9",
                }}
              />
            );
          }
          if (layout === "side_by_side" || layout === "top_bottom") {
            const isSide = layout === "side_by_side";
            return (
              <div
                className="absolute inset-0"
                style={{ display: "flex", flexDirection: isSide ? "row" : "column" }}
              >
                <div className="flex-1" />
                <video
                  src={current.videoOverlayUrl}
                  muted loop autoPlay playsInline
                  className="flex-1 object-cover"
                />
              </div>
            );
          }
          // compare_h / compare_v : aperçu figé à mi-révélation, pour donner
          // une idée du comparateur (le vrai balayage animé est visible dans
          // la vidéo exportée).
          const isHorizontal = layout === "compare_h";
          return (
            <div
              className="absolute inset-0 overflow-hidden"
              style={isHorizontal ? { clipPath: "inset(0 0 0 50%)" } : { clipPath: "inset(50% 0 0 0)" }}
            >
              <video src={current.videoOverlayUrl} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              <div
                className="absolute bg-white/80"
                style={isHorizontal ? { left: 0, top: 0, bottom: 0, width: 2 } : { top: 0, left: 0, right: 0, height: 2 }}
              />
            </div>
          );
        })()}
        {/* Aperçu statique (non animé) des stickers, juste pour visualiser leur position de départ */}
        {!showDrawing && (current.animatedStickers || []).map((s, i) => {
          const meta = STICKER_TYPES.find((t) => t.id === s.type);
          if (!meta) return null;
          return (
            <img
              key={i} src={meta.icon} alt=""
              className="absolute pointer-events-none opacity-90"
              style={{
                left: `${s.x * 100}%`, top: `${s.y * 100}%`,
                width: `${s.size * 100}%`, transform: "translate(-50%,-50%)",
              }}
            />
          );
        })}
        {current.hasDrawing && (
          <img
            src={current.overlayDataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}

        {showDrawing ? (
          <OverlayComposer
            platform={platform}
            dims={dims}
            containerRef={containerRef}
            selectedMediaId={selectedMediaId}
            setSelectedMediaId={setSelectedMediaId}
          />
        ) : (
          // Aperçu final (non éditable) : chaque émoji/photo apparaît et
          // disparaît exactement selon sa fenêtre start/end, en suivant la
          // lecture réelle de la vidéo ci-dessus.
          <MediaOverlayLayer items={mediaOverlays} mode="preview" previewTime={currentTime} />
        )}
      </div>

      {/* Barre de lecture synchronisée sur l'extrait réellement exporté :
          sert de repère commun pour tous les réglages "Apparaît à /
          Disparaît à" ci-dessous (vidéo incrustée, émojis/photos, stickers
          animés), afin que l'utilisateur cale leur apparition/disparition
          sur ce qu'il voit défiler ici. */}
      <div className="mt-2 text-gray-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            title={isPlaying ? "Pause" : "Lecture"}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <input
            type="range" min={0} max={clipDuration} step={0.1}
            value={Math.min(currentTime, clipDuration)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="text-[11px] font-mono tabular-nums text-right mt-0.5">
          {formatTime(currentTime)} / {formatTime(clipDuration)}
        </div>
      </div>

      <FilterRow
        title="Filtres couleur"
        icon={<Palette size={11} className="text-gray-400" />}
        items={FILTERS}
        activeId={current.filter}
        onSelect={(id) => setPlatformFilter(platform, id)}
      />
      <FilterRow
        title="Effets spéciaux"
        icon={<Sparkles size={11} className="text-purple-500" />}
        items={EFFECTS}
        activeId={current.filter}
        onSelect={(id) => setPlatformFilter(platform, id)}
      />

      <MediaOverlaysPanel
        platform={platform}
        items={mediaOverlays}
        selectedId={selectedMediaId}
        onSelect={(id) => { setSelectedMediaId(id); setShowDrawing(true); }}
        onUpdate={(id, patch) => updateMediaOverlay(platform, id, patch)}
        onRemove={(id) => { removeMediaOverlay(platform, id); if (selectedMediaId === id) setSelectedMediaId(null); }}
        currentTime={currentTime}
        onSeek={handleSeek}
      />

      <VideoOverlayPanel platform={platform} currentTime={currentTime} onSeek={handleSeek} />
      <AnimatedStickersPanel platform={platform} currentTime={currentTime} onSeek={handleSeek} />
    </div>
  );
}

export default function PlatformEditor() {
  const { platforms, sourceUrl } = useCampaignStore();

  if (!sourceUrl || platforms.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Eraser size={16} /> Filtres, dessin &amp; effets par réseau
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Dessine au pinceau, ajoute des émojis ou une photo — glisse-les pour les repositionner,
        tire leurs bords pour les redimensionner, et choisis quand chacun apparaît et disparaît
        pendant la vidéo. Superpose aussi une 2ᵉ vidéo — en incrustation (PiP), en écran partagé
        (côte à côte / haut-bas) ou en comparateur avant/après animé — avec une apparition et une
        disparition précises, et anime des stickers (fleur, papillon), indépendamment pour chaque
        plateforme. Inclut aussi des effets{" "}
        <Sparkles size={11} className="inline -mt-0.5 text-purple-500" /> exclusifs (glitch RGB,
        VHS, néon, pixel art, infrarouge...) introuvables dans l'appareil photo d'un téléphone ou
        les filtres classiques des autres applis.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <PlatformCard key={platform} platform={platform} sourceUrl={sourceUrl} />
        ))}
      </div>
    </div>
  );
}
