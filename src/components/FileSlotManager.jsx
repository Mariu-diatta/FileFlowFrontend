import { useEffect, useRef, useState } from "react";
import {
  GripVertical,
  X,
  RefreshCw,
  FileText,
  FileAudio2,
  FileVideo2,
  FileImage,
  File as FileIcon,
} from "lucide-react";
import FileDropzone from "./FileDropzone";

function iconForFile(file) {
  const type = file.type || "";
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo2;
  if (type.startsWith("audio/")) return FileAudio2;
  if (type === "application/pdf") return FileText;
  return FileIcon;
}

// Aperçu miniature d'un fichier local (avant envoi au serveur) : vraie
// vignette pour image/vidéo, icône générique sinon. Révoque l'URL objet à
// chaque changement pour ne pas fuir de mémoire.
function FileThumb({ file }) {
  const [url, setUrl] = useState(null);
  const isVisual = file.type?.startsWith("image/") || file.type?.startsWith("video/");

  useEffect(() => {
    if (!isVisual) {
      setUrl(null);
      return undefined;
    }
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file, isVisual]);

  if (url && file.type.startsWith("image/")) {
    return <img src={url} alt={file.name} className="w-full h-full object-cover" />;
  }
  if (url && file.type.startsWith("video/")) {
    return <video src={url} className="w-full h-full object-cover" muted playsInline />;
  }
  const Icon = iconForFile(file);
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Icon size={22} className="text-gray-400" />
    </div>
  );
}

/**
 * Remplace le simple champ d'upload par une liste de "cartes" visibles, une
 * par fichier déjà choisi : aperçu (image/vidéo) ou icône, nom, bouton
 * "remplacer" (ne change que ce fichier-là, garde sa position) et bouton de
 * suppression. Quand `multiple` est vrai, les cartes sont glissables pour
 * réordonner les fichiers (l'ordre envoyé au serveur = l'ordre affiché,
 * essentiel pour les fusions PDF/vidéo/image ou les outils "fichier A + B").
 *
 * `labels` (optionnel) : tableau de libellés de rôle alignés sur l'index
 * (ex: ["Ancienne version", "Nouvelle version"]) — sinon "Fichier N".
 * `orderHint` (optionnel) : phrase d'aide affichée au-dessus dès que 2+
 * fichiers sont présents (ex: "Glisse pour changer l'ordre de fusion").
 */
export default function FileSlotManager({
  multiple = false,
  files = [],
  onFiles,
  labels,
  orderHint,
  accept,
  label,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const replaceInputRef = useRef(null);
  const replaceTargetIndex = useRef(null);

  const handleAdd = (newFiles) => {
    if (!multiple) {
      onFiles(newFiles.slice(0, 1));
      return;
    }
    onFiles([...files, ...newFiles]);
  };

  const handleRemove = (index) => {
    onFiles(files.filter((_, i) => i !== index));
  };

  const handleReplaceClick = (index) => {
    replaceTargetIndex.current = index;
    replaceInputRef.current?.click();
  };

  const handleReplaceChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const idx = replaceTargetIndex.current;
    const next = [...files];
    next[idx] = f;
    onFiles(next);
    e.target.value = "";
  };

  const handleDragStart = (index) => (e) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Nécessaire pour que Firefox autorise le drag.
    e.dataTransfer.setData("text/plain", String(index));
  };
  const handleDragEnter = (index) => (e) => {
    e.preventDefault();
    if (dragIndex !== null) setOverIndex(index);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDrop = (index) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...files];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onFiles(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div>
      {orderHint && files.length > 1 && (
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <GripVertical size={12} /> {orderHint}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}-${file.lastModified || 0}`}
              draggable={multiple}
              onDragStart={handleDragStart(index)}
              onDragEnter={handleDragEnter(index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`w-32 shrink-0 border rounded-xl overflow-hidden bg-white transition ${
                overIndex === index && dragIndex !== null && dragIndex !== index
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200"
              } ${dragIndex === index ? "opacity-40" : ""} ${multiple ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <div className="relative h-20 bg-gray-50">
                <FileThumb file={file} />
                {multiple && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                  aria-label="Retirer ce fichier"
                  title="Retirer"
                >
                  <X size={12} />
                </button>
                {multiple && files.length > 1 && (
                  <div className="absolute bottom-1 right-1 text-white/90 drop-shadow">
                    <GripVertical size={14} />
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <p className="text-[11px] text-gray-600 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-blue-600 font-medium truncate">
                  {labels?.[index] || (multiple ? `Fichier ${index + 1}` : "")}
                </p>
                <button
                  type="button"
                  onClick={() => handleReplaceClick(index)}
                  className="mt-1 text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Remplacer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={replaceInputRef} type="file" accept={accept} className="hidden" onChange={handleReplaceChange} />

      {(multiple || files.length === 0) && (
        <FileDropzone
          multiple={multiple}
          accept={accept}
          files={[]}
          onFiles={handleAdd}
          compact={files.length > 0}
          label={
            files.length > 0
              ? `Glisse-dépose ${multiple ? "un ou plusieurs autres fichiers" : "un fichier"} ici, ou clique pour parcourir`
              : label
          }
        />
      )}
    </div>
  );
}
