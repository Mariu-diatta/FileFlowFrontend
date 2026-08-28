import { useState, useRef } from "react";
import { UploadCloud, Link as LinkIcon, Loader2 } from "lucide-react";

// Transforme un lien de partage "classique" (Google Drive, Dropbox) en lien
// de téléchargement direct, pour permettre l'import sans passer par un
// backend dédié. Si le lien ne correspond à aucun de ces cas, on le laisse
// tel quel (URL directe vers un fichier).
function normalizeCloudUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("drive.google.com")) {
      const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    if (url.hostname.includes("dropbox.com")) {
      url.searchParams.set("dl", "1");
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function guessFilename(url, blob) {
  try {
    const clean = decodeURIComponent(url.split("?")[0]);
    const last = clean.split("/").filter(Boolean).pop();
    if (last && last.includes(".")) return last;
  } catch {
    // ignore
  }
  const ext = blob.type?.split("/")?.[1] || "bin";
  return `fichier-importe.${ext}`;
}

export default function FileDropzone({
  multiple = false,
  accept,
  files = [],
  onFiles,
  label,
  compact = false,
  allowUrlImport = true,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const list = Array.from(fileList || []);
    if (list.length === 0) return;
    onFiles(multiple ? list : list.slice(0, 1));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const target = normalizeCloudUrl(importUrl.trim());
      const res = await fetch(target);
      if (!res.ok) throw new Error("download-failed");
      const blob = await res.blob();
      const file = new File([blob], guessFilename(target, blob), { type: blob.type });
      handleFiles([file]);
      setImportUrl("");
    } catch {
      setImportError(
        "Import direct impossible pour ce lien (le service bloque l'accès externe). Télécharge le fichier puis dépose-le ci-dessus."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-xl text-center cursor-pointer transition bg-white ${
          compact ? "p-6" : "p-8"
        } ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
      >
        <UploadCloud
          className={`mx-auto mb-2 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
          size={compact ? 28 : 32}
        />
        <p className="text-sm text-gray-600">
          {files.length > 0
            ? files.map((f) => f.name).join(", ")
            : label ||
              (isDragging
                ? "Dépose ton fichier ici"
                : `Glisse-dépose ${multiple ? "tes fichiers" : "ton fichier"} ici, ou clique pour parcourir`)}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {allowUrlImport && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <LinkIcon size={14} className="text-gray-400 shrink-0" />
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Ou colle un lien Google Drive, Dropbox, ou une URL directe..."
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleImportUrl();
                }
              }}
            />
            <button
              type="button"
              onClick={handleImportUrl}
              disabled={importing || !importUrl.trim()}
              className="text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
            >
              {importing && <Loader2 className="animate-spin" size={12} />}
              Importer
            </button>
          </div>
          {importError && <p className="text-xs text-amber-600 mt-1">{importError}</p>}
        </>
      )}
    </div>
  );
}
