import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { repostApi } from "../../api/repost";
import { useCampaignStore } from "../../stores/campaignStore";

const PLATFORM_LABELS = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts",
  linkedin: "LinkedIn", facebook: "Facebook", x: "X (Twitter)",
};

// Liste de secours utilisée si l'API /repost/platforms/ n'est pas disponible
// ou renvoie une liste vide, afin que les plateformes cibles restent
// toujours visibles et sélectionnables dans la section Multi-publication.
const DEFAULT_PLATFORM_SPECS = [
  { id: "tiktok", width: 1080, height: 1920 },
  { id: "instagram", width: 1080, height: 1920 },
  { id: "youtube", width: 1080, height: 1920 },
  { id: "linkedin", width: 1920, height: 1080 },
  { id: "facebook", width: 1080, height: 1080 },
  { id: "x", width: 1920, height: 1080 },
];

export default function PlatformSelector() {
  const { platforms, togglePlatform } = useCampaignStore();
  const [specs, setSpecs] = useState(DEFAULT_PLATFORM_SPECS);

  useEffect(() => {
    repostApi
      .listPlatforms()
      .then(({ data }) => {
        if (Array.isArray(data?.platforms) && data.platforms.length > 0) {
          setSpecs(data.platforms);
        }
      })
      .catch(() => {
        // On garde la liste de secours : mieux vaut des tailles par défaut
        // qu'une section vide qui bloque la sélection des plateformes.
      });
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Plateformes cibles</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {specs.map((spec) => {
          const selected = platforms.includes(spec.id);
          const ratio = spec.width > spec.height ? "16:9" : "9:16";
          return (
            <button
              key={spec.id}
              onClick={() => togglePlatform(spec.id)}
              className={`text-left border rounded-lg p-3 transition ${
                selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{PLATFORM_LABELS[spec.id] || spec.id}</span>
                {selected && <Check size={14} className="text-blue-600" />}
              </div>
              <span className="text-xs text-gray-400">
                {spec.width}×{spec.height} ({ratio})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
