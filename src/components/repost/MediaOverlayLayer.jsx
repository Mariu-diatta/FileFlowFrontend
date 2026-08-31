import { useCallback, useRef } from "react";
import { Trash2, X } from "lucide-react";
import { TimeField } from "./TimeField";

// --- Calque interactif pour les émojis/photos ajoutés sur l'aperçu -------
// Chaque élément est stocké en fractions (0-1) du cadre vidéo (x, y = coin
// haut-gauche, width/height = taille) afin de rester correct quelle que
// soit la résolution finale exportée côté serveur (voir repost/pipeline.py,
// qui reçoit ces mêmes fractions pour positionner l'overlay au pixel près).
//
// Deux modes d'affichage :
//  - édition (showDrawing = true) : tous les éléments sont visibles en
//    permanence, déplaçables (glisser le corps) et redimensionnables
//    (glisser un des 8 poignées sur les bords/coins).
//  - aperçu (showDrawing = false) : rendu figé mais non interactif, dont la
//    visibilité suit exactement la fenêtre d'apparition/disparition
//    (start/end) par rapport au temps de lecture réel de la vidéo.

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_SIZE = 0.04; // 4% du cadre, en largeur comme en hauteur

const HANDLE_CURSORS = {
  nw: "nwse-resize", se: "nwse-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize",
  e: "ew-resize", w: "ew-resize",
};

const HANDLE_POS = {
  nw: { left: 0, top: 0 }, n: { left: "50%", top: 0 }, ne: { left: "100%", top: 0 },
  e: { left: "100%", top: "50%" }, se: { left: "100%", top: "100%" }, s: { left: "50%", top: "100%" },
  sw: { left: 0, top: "100%" }, w: { left: 0, top: "50%" },
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function MediaOverlayItem({ item, containerRef, selected, onSelect, onChange, onRemove }) {
  const dragRef = useRef(null); // { type: "move"|handleId, startX, startY, origin }

  const getRect = () => containerRef.current.getBoundingClientRect();

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = getRect();
    const dxFrac = (e.clientX - drag.startX) / rect.width;
    const dyFrac = (e.clientY - drag.startY) / rect.height;
    const o = drag.origin;

    if (drag.type === "move") {
      const x = clamp(o.x + dxFrac, 0, 1 - o.width);
      const y = clamp(o.y + dyFrac, 0, 1 - o.height);
      onChange({ x, y });
      return;
    }

    // Redimensionnement : chaque poignée déplace un ou deux bords, les
    // bords opposés restent fixes (comme dans un éditeur d'image classique).
    let { x, y, width, height } = o;
    const right = o.x + o.width;
    const bottom = o.y + o.height;
    if (drag.type.includes("e")) width = clamp(o.width + dxFrac, MIN_SIZE, 1 - o.x);
    if (drag.type.includes("s")) height = clamp(o.height + dyFrac, MIN_SIZE, 1 - o.y);
    if (drag.type.includes("w")) {
      x = clamp(o.x + dxFrac, 0, right - MIN_SIZE);
      width = right - x;
    }
    if (drag.type.includes("n")) {
      y = clamp(o.y + dyFrac, 0, bottom - MIN_SIZE);
      height = bottom - y;
    }
    onChange({ x, y, width, height });
  }, [onChange]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: item.x, y: item.y, width: item.width, height: item.height },
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width: `${item.width * 100}%`,
        height: `${item.height * 100}%`,
        touchAction: "none",
        outline: selected ? "2px solid #3b82f6" : "2px solid transparent",
        outlineOffset: 2,
        cursor: "move",
        zIndex: selected ? 20 : 10,
        containerType: "size",
      }}
      onPointerDown={startDrag("move")}
    >
      {item.kind === "emoji" ? (
        <div className="w-full h-full flex items-center justify-center leading-none">
          <span style={{ fontSize: "72cqmin" }}>{item.content}</span>
        </div>
      ) : (
        <img src={item.content} alt="" draggable={false} className="w-full h-full object-contain pointer-events-none" />
      )}

      {selected && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            title="Supprimer"
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
          >
            <X size={11} />
          </button>
          {HANDLES.map((h) => (
            <div
              key={h}
              onPointerDown={startDrag(h)}
              className="absolute w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow"
              style={{
                left: HANDLE_POS[h].left,
                top: HANDLE_POS[h].top,
                transform: "translate(-50%, -50%)",
                cursor: HANDLE_CURSORS[h],
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function MediaOverlayLayer({ items, mode, interactive, previewTime, containerRef, selectedId, onSelect, onChange, onRemove }) {
  const isEdit = mode === "edit";
  return (
    <div className="absolute inset-0" style={{ pointerEvents: isEdit && interactive ? "auto" : "none" }}>
      {items.map((item) => {
        if (!isEdit) {
          const visible = previewTime >= (item.start || 0) && (item.end == null || previewTime <= item.end);
          if (!visible) return null;
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: `${item.x * 100}%`, top: `${item.y * 100}%`,
                width: `${item.width * 100}%`, height: `${item.height * 100}%`,
                containerType: "size",
              }}
            >
              {item.kind === "emoji" ? (
                <div className="w-full h-full flex items-center justify-center leading-none">
                  <span style={{ fontSize: "72cqmin" }}>{item.content}</span>
                </div>
              ) : (
                <img src={item.content} alt="" className="w-full h-full object-contain" />
              )}
            </div>
          );
        }
        return (
          <MediaOverlayItem
            key={item.id}
            item={item}
            containerRef={containerRef}
            selected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
            onChange={(patch) => onChange(item.id, patch)}
            onRemove={() => onRemove(item.id)}
          />
        );
      })}
    </div>
  );
}

// --- Panneau listant les calques médias avec réglages précis d'apparition/
// disparition (complète le glisser-déposer, plus simple sur petit écran).
// currentTime/onSeek permettent de synchroniser sur la vidéo réseau social
// réellement affichée : capturer l'instant en cours, ou vérifier un instant
// déjà saisi en y déplaçant la lecture.
export function MediaOverlaysPanel({ platform, items, onUpdate, onRemove, onSelect, selectedId, currentTime, onSeek }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <span className="text-xs font-medium text-gray-600 block mb-1.5">Apparition des émojis/photos</span>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer ${
              selectedId === item.id ? "bg-blue-50 ring-1 ring-blue-300" : "bg-gray-50"
            }`}
          >
            {item.kind === "emoji" ? (
              <span className="text-base leading-none w-5 text-center shrink-0">{item.content}</span>
            ) : (
              <img src={item.content} alt="" className="w-5 h-5 object-cover rounded shrink-0" />
            )}
            <TimeField
              label="Apparaît à" value={item.start} currentTime={currentTime} onSeek={onSeek}
              onChange={(v) => onUpdate(item.id, { start: v ?? 0 })}
            />
            <TimeField
              label="Disparaît à" value={item.end} currentTime={currentTime} onSeek={onSeek}
              allowEmpty placeholder="fin"
              onChange={(v) => onUpdate(item.id, { end: v })}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="ml-auto text-gray-400 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
