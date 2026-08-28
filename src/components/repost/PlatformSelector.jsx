import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { repostApi } from "../../api/repost";
import { useCampaignStore } from "../../stores/campaignStore";

const PLATFORM_LABELS = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts",
  linkedin: "LinkedIn", facebook: "Facebook", x: "X (Twitter)",
};

export default function PlatformSelector() {
  const { platforms, togglePlatform } = useCampaignStore();
  const [specs, setSpecs] = useState([]);

  useEffect(() => {
    repostApi.listPlatforms().then(({ data }) => setSpecs(data.platforms));
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
