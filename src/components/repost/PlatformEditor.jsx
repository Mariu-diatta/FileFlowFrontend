import { useEffect, useRef, useState } from "react";
import { Eraser, Palette, Pencil, Undo2 } from "lucide-react";
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

function DrawingCanvas({ platform, dims }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
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

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const draw = (e) => {
    if (!drawing.current) return;
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
    if (!drawing.current) return;
    drawing.current = false;
    exportOverlay();
  };

  const exportOverlay = () => {
    const canvas = canvasRef.current;
    setPlatformOverlay(platform, canvas.toDataURL("image/png"));
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
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 bg-black/50 backdrop-blur rounded-lg px-2 py-1.5">
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
        <input
          type="range" min={2} max={20} value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-16"
          aria-label="Épaisseur du trait"
        />
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
          <Pencil size={12} /> {showDrawing ? "Terminer le dessin" : "Dessiner"}
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
    </div>
  );
}

export default function PlatformEditor() {
  const { platforms, sourceUrl } = useCampaignStore();

  if (!sourceUrl || platforms.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Eraser size={16} /> Filtres &amp; dessin par réseau
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Applique un filtre couleur et/ou dessine par-dessus la vidéo, indépendamment pour chaque
        plateforme, avant de générer les versions.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <PlatformCard key={platform} platform={platform} sourceUrl={sourceUrl} />
        ))}
      </div>
    </div>
  );
}
