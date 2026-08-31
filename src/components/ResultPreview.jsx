import { useEffect, useMemo, useState } from "react";
import { Download, File as FileIcon } from "lucide-react";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];
const VIDEO_EXTS = ["mp4", "mov", "webm", "mkv", "avi"];
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "m4a"];

function splitName(filename) {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return [filename, ""];
  return [filename.slice(0, idx), filename.slice(idx + 1)];
}

function kindFromContentType(contentType, ext) {
  if (contentType?.startsWith("image/") || IMAGE_EXTS.includes(ext)) return "image";
  if (contentType?.startsWith("video/") || VIDEO_EXTS.includes(ext)) return "video";
  if (contentType?.startsWith("audio/") || AUDIO_EXTS.includes(ext)) return "audio";
  if (contentType === "application/pdf" || ext === "pdf") return "pdf";
  return "other";
}

/**
 * Affiche un aperçu réel (et pas juste un lien) du fichier produit par un
 * outil, avant que l'utilisateur ne le télécharge : image/vidéo/audio/PDF
 * rendus directement dans la page ; autres types -> icône générique. Le nom
 * du fichier (hors extension, conservée pour ne pas casser le type) est
 * modifiable et sert directement d'attribut `download` du bouton final.
 */
export default function ResultPreview({ resultUrl, suggestedFilename, contentType }) {
  const [baseName, ext] = useMemo(() => splitName(suggestedFilename || "resultat"), [suggestedFilename]);
  const [customBaseName, setCustomBaseName] = useState(baseName);

  useEffect(() => {
    setCustomBaseName(baseName);
  }, [baseName]);

  if (!resultUrl) return null;

  const kind = kindFromContentType(contentType, ext.toLowerCase());
  const cleanBase = (customBaseName || "resultat").trim().replace(/[/\\]/g, "-") || "resultat";
  const finalFilename = ext ? `${cleanBase}.${ext}` : cleanBase;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aperçu du résultat</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customBaseName}
            onChange={(e) => setCustomBaseName(e.target.value)}
            placeholder="Nom du fichier"
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
            aria-label="Nom du fichier avant téléchargement"
          />
          {ext && <span className="text-sm text-gray-400 font-mono shrink-0">.{ext}</span>}
        </div>
      </div>

      <div className="p-4 flex items-center justify-center bg-gray-50/60">
        {kind === "image" && (
          <img src={resultUrl} alt="Aperçu du résultat" className="max-h-[420px] max-w-full rounded-lg shadow-sm" />
        )}
        {kind === "video" && (
          <video src={resultUrl} controls className="max-h-[420px] max-w-full rounded-lg shadow-sm" />
        )}
        {kind === "audio" && <audio src={resultUrl} controls className="w-full" />}
        {kind === "pdf" && (
          <iframe
            src={resultUrl}
            title="Aperçu PDF"
            className="w-full h-[480px] rounded-lg border border-gray-200 bg-white"
          />
        )}
        {kind === "other" && (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
            <FileIcon size={36} />
            <p className="text-sm text-center max-w-xs">
              Aperçu non disponible pour ce type de fichier, mais il est prêt à être téléchargé.
            </p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <a
          href={resultUrl}
          download={finalFilename}
          className="w-full block text-center bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Download size={18} /> Télécharger « {finalFilename} »
        </a>
      </div>
    </div>
  );
}
