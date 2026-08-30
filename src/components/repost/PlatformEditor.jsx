import { useRef, useState } from "react";
import { Eraser, Palette, Pencil, Undo2, Smile, ImagePlus, Video, X, Sparkles } from "lucide-react";
import { useCampaignStore } from "../../stores/campaignStore";

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

// Filtres proposés : appliqués réellement côté serveur via ffmpeg (aucune
// IA/GPU, voir repost/pipeline.py COLOR_FILTERS). L'aperçu CSS ci-dessous
// est une approximation visuelle, pas le rendu pixel-perfect final.
const FILTERS = [
  { id: "none", label: "Aucun", css: "none" },
  { id: "noir_blanc", label: "Noir & blanc", css: "grayscale(1)" },
  { id: "sepia", label: "Sépia", css: "sepia(0.8)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.35) contrast(0.9) brightness(1.05) saturate(0.8)" },
  { id: "contraste", label: "Contraste +", css: "contrast(1.35) brightness(1.02)" },
  { id: "chaud", label: "Ton chaud", css: "sepia(0.15) saturate(1.2) hue-rotate(-8deg)" },
  { id: "froid", label: "Ton froid", css: "saturate(1.1) hue-rotate(8deg) brightness(1.02)" },
];

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

// --- Canvas de dessin : trait libre, émojis et photo, aplatis en un même
// PNG transparent envoyé au serveur (voir api/repost.js, overlay_<platform>).
function DrawingCanvas({ platform, dims }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const photoImgRef = useRef(null);
  const [mode, setMode] = useState("pen"); // "pen" | "emoji" | "photo"
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [selectedEmoji, setSelectedEmoji] = useState(QUICK_EMOJIS[0]);
  const [stickerSize, setStickerSize] = useState(Math.round(dims.width * 0.16));
  const [photoReady, setPhotoReady] = useState(false);
  const { setPlatformOverlay, clearPlatformOverlay } = useCampaignStore();

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
    if (mode !== "pen") return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const draw = (e) => {
    if (mode !== "pen" || !drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize * (canvasRef.current.width / canvasRef.current.getBoundingClientRect().width);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (mode !== "pen" || !drawing.current) return;
    drawing.current = false;
    exportOverlay();
  };

  // Émoji / photo : un tap sur le canvas "tamponne" l'élément sélectionné à
  // l'endroit touché (pas de repositionnement après coup — on peut effacer
  // et retenter). Le placement est directement aplati dans le raster, comme
  // le trait de pinceau.
  const handleStampClick = (e) => {
    if (mode === "pen") return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    if (mode === "emoji") {
      ctx.font = `${stickerSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(selectedEmoji, x, y);
      exportOverlay();
    } else if (mode === "photo" && photoImgRef.current && photoReady) {
      const img = photoImgRef.current;
      const w = stickerSize;
      const h = stickerSize * (img.naturalHeight / img.naturalWidth || 1);
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      exportOverlay();
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setPhotoReady(true);
    img.src = URL.createObjectURL(file);
    photoImgRef.current = img;
  };

  const handleClear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    clearPlatformOverlay(platform);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className={`absolute inset-0 w-full h-full touch-none ${mode === "pen" ? "cursor-crosshair" : "cursor-copy"}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        onClick={handleStampClick}
      />

      {/* Sélecteur de mode */}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded-lg px-1.5 py-1">
        <button type="button" onClick={() => setMode("pen")} title="Dessiner"
          className={`p-1.5 rounded ${mode === "pen" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={() => setMode("emoji")} title="Émoji"
          className={`p-1.5 rounded ${mode === "emoji" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <Smile size={14} />
        </button>
        <label title="Photo" className={`p-1.5 rounded cursor-pointer ${mode === "photo" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}>
          <ImagePlus size={14} />
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => { handlePhotoChange(e); setMode("photo"); }}
          />
        </label>
        <div className="flex-1" />
        <input
          type="range" min={16} max={Math.round(Math.min(dims.width, dims.height) * 0.5)}
          value={stickerSize} onChange={(e) => setStickerSize(Number(e.target.value))}
          className="w-14" title="Taille"
        />
      </div>

      {/* Sélecteur d'émojis rapides */}
      {mode === "emoji" && (
        <div className="absolute top-11 left-2 right-2 flex flex-wrap gap-1 bg-black/50 backdrop-blur rounded-lg px-1.5 py-1">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em} type="button" onClick={() => setSelectedEmoji(em)}
              className={`text-base leading-none w-6 h-6 flex items-center justify-center rounded ${selectedEmoji === em ? "bg-white/90" : ""}`}
            >
              {em}
            </button>
          ))}
        </div>
      )}
      {mode === "photo" && !photoReady && (
        <div className="absolute top-11 left-2 right-2 text-[11px] text-white bg-black/50 backdrop-blur rounded-lg px-2 py-1.5">
          Choisis une photo puis touche l'aperçu pour la placer.
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 bg-black/50 backdrop-blur rounded-lg px-2 py-1.5">
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
        ) : (
          <span className="text-[11px] text-white/80">Touche l'aperçu pour placer</span>
        )}
        {mode === "pen" && (
          <input
            type="range" min={2} max={20} value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16"
            aria-label="Épaisseur du trait"
          />
        )}
        <button
          type="button"
          onClick={handleClear}
          className="text-white/90 hover:text-white flex items-center gap-1 text-xs"
        >
          <Undo2 size={14} /> Effacer
        </button>
      </div>
    </div>
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

function VideoOverlayPanel({ platform }) {
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
            <label className="text-xs text-gray-500 flex items-center gap-1">
              Apparaît à
              <input
                type="number" min={0} step={0.5} value={cfg.start}
                onChange={(e) => setVideoOverlayConfig(platform, { start: Math.max(0, Number(e.target.value)) })}
                className="w-14 text-xs border border-gray-200 rounded-lg px-1.5 py-1"
              />s
            </label>
            <label className="text-xs text-gray-500 flex items-center gap-1">
              Disparaît à
              <input
                type="number" min={0} step={0.5} placeholder="fin"
                value={cfg.end ?? ""}
                onChange={(e) => setVideoOverlayConfig(platform, { end: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                className="w-16 text-xs border border-gray-200 rounded-lg px-1.5 py-1"
              />s
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stickers animés (fleur qui bouge, papillon qui vole) ------------------
function AnimatedStickersPanel({ platform }) {
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
            <label className="text-[11px] text-gray-500 flex items-center gap-0.5">
              Départ
              <input
                type="number" min={0} step={0.5} value={sticker.start}
                onChange={(e) => updateAnimatedSticker(platform, i, { start: Math.max(0, Number(e.target.value)) })}
                className="w-12 text-xs border border-gray-200 rounded-lg px-1 py-0.5"
              />s
            </label>
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

function PlatformCard({ platform, sourceUrl }) {
  const dims = PLATFORM_DIMENSIONS[platform] || { width: 1080, height: 1920 };
  const ratio = dims.width > dims.height ? "16 / 9" : "9 / 16";
  const { getPlatformOption, setPlatformFilter } = useCampaignStore();
  const [showDrawing, setShowDrawing] = useState(false);
  const current = getPlatformOption(platform);
  const activeFilter = FILTERS.find((f) => f.id === current.filter) || FILTERS[0];

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-sm">{PLATFORM_LABELS[platform] || platform}</strong>
        <button
          type="button"
          onClick={() => setShowDrawing((v) => !v)}
          className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg ${
            showDrawing ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Pencil size={12} /> {showDrawing ? "Terminer" : "Dessin / émoji / photo"}
        </button>
      </div>

      <div
        className="relative mx-auto bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: ratio, maxWidth: dims.width > dims.height ? "100%" : 220 }}
      >
        {sourceUrl && (
          <video
            src={sourceUrl}
            muted
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
                muted loop autoPlay
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
                  muted loop autoPlay
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
              <video src={current.videoOverlayUrl} muted loop autoPlay className="absolute inset-0 w-full h-full object-cover" />
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
        {showDrawing && <DrawingCanvas platform={platform} dims={dims} />}
        {!showDrawing && current.hasDrawing && (
          <img
            src={current.overlayDataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Palette size={13} className="text-gray-400 shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setPlatformFilter(platform, f.id)}
            className={`text-xs px-2 py-1 rounded-full border ${
              current.filter === f.id || (!current.filter && f.id === "none")
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <VideoOverlayPanel platform={platform} />
      <AnimatedStickersPanel platform={platform} />
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
        Dessine, ajoute des émojis ou une photo, superpose une 2ᵉ vidéo — en incrustation (PiP),
        en écran partagé (côte à côte / haut-bas) ou en comparateur avant/après animé — avec une
        apparition et une disparition précises, et anime des stickers (fleur, papillon),
        indépendamment pour chaque plateforme.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <PlatformCard key={platform} platform={platform} sourceUrl={sourceUrl} />
        ))}
      </div>
    </div>
  );
}
