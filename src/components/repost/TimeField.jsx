import { Crosshair, Play } from "lucide-react";

// Affiche un temps en m:ss(.d) — cohérent avec l'échelle de la vidéo de
// l'extrait (0 = début de l'extrait choisi dans ClipTimeEditor, pas le
// début du fichier source complet).
export function formatTime(t) {
  if (t == null || Number.isNaN(t)) return "--:--";
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

// Champ "Apparaît à" / "Disparaît à" avec deux raccourcis :
//  - la cible : capture l'instant actuel de la vidéo de l'extrait dans le champ
//  - le triangle "lecture" : déplace la lecture de l'aperçu jusqu'à la valeur
//    du champ, pour vérifier visuellement que ça tombe au bon moment.
// currentTime/onSeek sont exprimés en secondes depuis le début de l'extrait
// (même échelle que la barre de lecture affichée sous l'aperçu).
export function TimeField({ label, value, onChange, currentTime, onSeek, allowEmpty, placeholder }) {
  return (
    <label className="text-[11px] text-gray-500 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {label}
      <input
        type="number" min={0} step={0.1}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          if (allowEmpty && e.target.value === "") return onChange(null);
          onChange(Math.max(0, Number(e.target.value)));
        }}
        className="w-14 text-xs border border-gray-200 rounded-lg px-1 py-0.5"
      />
      <span className="text-gray-300 mr-0.5">s</span>
      {typeof currentTime === "number" && (
        <button
          type="button"
          title={`Utiliser l'instant actuel de l'aperçu (${formatTime(currentTime)})`}
          onClick={() => onChange(Math.round(currentTime * 10) / 10)}
          className="p-0.5 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
        >
          <Crosshair size={12} />
        </button>
      )}
      {onSeek && value != null && (
        <button
          type="button"
          title="Aller à ce moment dans l'aperçu"
          onClick={() => onSeek(value)}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <Play size={12} />
        </button>
      )}
    </label>
  );
}
