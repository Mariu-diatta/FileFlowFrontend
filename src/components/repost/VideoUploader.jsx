import { useRef } from "react";
import { UploadCloud, Film } from "lucide-react";
import { useCampaignStore } from "../../stores/campaignStore";

export default function VideoUploader() {
  const { sourceFile, sourceUrl, setSourceFile } = useCampaignStore();
  const hiddenVideoRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    // On charge la vidéo une fois dans un <video> caché pour connaître sa
    // durée réelle avant de l'enregistrer dans le store (utile pour borner
    // le sélecteur de découpe temporelle).
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      setSourceFile(file, url, probe.duration || 0);
    };
  };

  return (
    <div>
      <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition bg-white">
        <UploadCloud className="mx-auto mb-2 text-gray-400" size={28} />
        <p className="text-sm text-gray-600">
          {sourceFile ? sourceFile.name : "Clique pour choisir une vidéo"}
        </p>
        <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
      </label>

      {sourceUrl && (
        <div className="mt-3 rounded-lg overflow-hidden bg-black">
          <video src={sourceUrl} controls className="w-full max-h-64" />
        </div>
      )}

      {!sourceFile && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Film size={12} /> Formats courants acceptés (mp4, mov, webm...).
        </p>
      )}
    </div>
  );
}
