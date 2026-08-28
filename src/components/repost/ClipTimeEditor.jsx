import { useEffect, useRef, useState } from "react";
import { Play, Scissors } from "lucide-react";
import { useCampaignStore } from "../../stores/campaignStore";

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const MIN_CLIP = 1; // durée minimale d'un extrait, en secondes

export default function ClipTimeEditor() {
  const { sourceUrl, sourceDuration, clipStart, clipEnd, setClipRange } = useCampaignStore();
  const previewRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  const duration = sourceDuration || 0;

  const handleStartChange = (value) => {
    const start = Math.min(Number(value), clipEnd - MIN_CLIP);
    setClipRange(Math.max(0, start), clipEnd);
  };

  const handleEndChange = (value) => {
    const end = Math.max(Number(value), clipStart + MIN_CLIP);
    setClipRange(clipStart, Math.min(duration, end));
  };

  // Prévisualise uniquement l'extrait sélectionné : place la lecture au
  // début de l'extrait et coupe automatiquement à la fin.
  const handlePreview = () => {
    const video = previewRef.current;
    if (!video) return;
    video.currentTime = clipStart;
    video.play();
    setPreviewing(true);
  };

  useEffect(() => {
    const video = previewRef.current;
    if (!video) return undefined;
    const onTimeUpdate = () => {
      if (video.currentTime >= clipEnd) {
        video.pause();
        setPreviewing(false);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [clipEnd]);

  if (!sourceUrl) {
    return (
      <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl p-6 text-center">
        Choisis d'abord une vidéo pour régler l'extrait à publier.
      </div>
    );
  }

  const clipLength = clipEnd - clipStart;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Scissors size={16} /> Découper l'extrait
        </h3>
        <span className="text-sm text-gray-500">
          Durée de l'extrait : <strong>{clipLength.toFixed(1)}s</strong>
        </span>
      </div>

      <video ref={previewRef} src={sourceUrl} className="w-full max-h-56 rounded-lg mb-3 bg-black" controls />

      {/* Double curseur début / fin, superposés sur la même piste */}
      <div className="relative h-8 mb-2">
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded-full"
          style={{
            left: `${(clipStart / duration) * 100}%`,
            width: `${((clipEnd - clipStart) / duration) * 100}%`,
          }}
        />
        <input
          type="range" min={0} max={duration} step={0.1} value={clipStart}
          onChange={(e) => handleStartChange(e.target.value)}
          className="dual-range absolute w-full h-8 appearance-none bg-transparent"
          style={{ zIndex: clipStart > duration - clipEnd ? 4 : 2 }}
        />
        <input
          type="range" min={0} max={duration} step={0.1} value={clipEnd}
          onChange={(e) => handleEndChange(e.target.value)}
          className="dual-range absolute w-full h-8 appearance-none bg-transparent"
          style={{ zIndex: 3 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Début</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={duration} step={0.1} value={clipStart.toFixed(1)}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-400 w-10">{formatTime(clipStart)}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fin</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={duration} step={0.1} value={clipEnd.toFixed(1)}
              onChange={(e) => handleEndChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-400 w-10">{formatTime(clipEnd)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handlePreview}
        disabled={previewing}
        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
      >
        <Play size={14} /> {previewing ? "Lecture de l'extrait..." : "Prévisualiser cet extrait"}
      </button>
    </div>
  );
}
