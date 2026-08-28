import { Film } from "lucide-react";
import { useCampaignStore } from "../../stores/campaignStore";
import FileDropzone from "../FileDropzone";

export default function VideoUploader() {
  const { sourceFile, sourceUrl, setSourceFile } = useCampaignStore();

  const handleFiles = (files) => {
    const file = files?.[0];
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
      <FileDropzone
        accept="video/*"
        files={sourceFile ? [sourceFile] : []}
        onFiles={handleFiles}
        compact
        label="Glisse-dépose ta vidéo ici, clique pour parcourir, ou importe depuis un lien (Drive, Dropbox, URL...)"
      />

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
