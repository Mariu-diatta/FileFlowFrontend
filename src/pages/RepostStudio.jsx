import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, Send, Crown } from "lucide-react";
import VideoUploader from "../components/repost/VideoUploader";
import PlatformSelector from "../components/repost/PlatformSelector";
import PlatformEditor from "../components/repost/PlatformEditor";
import { VariantGrid } from "../components/repost/VariantGrid";
import { useCampaignStore } from "../stores/campaignStore";
import { useVideoJob } from "../hooks/useVideoJob";
import { useAuth } from "../context/AuthContext";
import { repostApi } from "../api/repost";

export default function RepostStudio() {
  const {
    sourceFile, clipStart, clipEnd, captionText, platforms, platformOptions,
    jobId, setCaptionText, setJobId, setJob,
  } = useCampaignStore();
  const { user } = useAuth();
  const canPublish = !!user?.is_premium;

  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [publishError, setPublishError] = useState("");

  const { job, loading: jobLoading } = useVideoJob(jobId, setJob);

  const canGenerate = sourceFile && platforms.length > 0 && clipEnd - clipStart >= 1;

  const handleGenerate = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await repostApi.createJob({
        file: sourceFile,
        clipStart,
        clipDuration: clipEnd - clipStart,
        captionText,
        platforms,
        platformOptions,
      });
      setJobId(data.id);
      setJob(data);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la création de la campagne.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setPublishError("");
    setPublishing(true);
    try {
      await repostApi.publishJob(jobId);
      const { data } = await repostApi.getJob(jobId);
      setJob(data);
    } catch (err) {
      setPublishError(err.response?.data?.error || "Erreur lors de la publication.");
    } finally {
      setPublishing(false);
    }
  };

  const isProcessing = job && (job.status === "queued" || job.status === "processing");
  const isCompleted = job && job.status === "completed";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="text-blue-600" size={22} /> Multi-publication vidéo
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Importe une vidéo, choisis l'extrait à publier, sélectionne les réseaux :
          FileFlow recadre et adapte automatiquement une version par plateforme —
          gratuitement, sans compte. Seule la publication directe sur les réseaux
          est réservée à Premium (les versions restent téléchargeables gratuitement).
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <VideoUploader />

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium mb-1">Légende / texte du post</label>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={3}
              placeholder="Décris ta vidéo — le texte sera adapté au ton de chaque plateforme."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <PlatformSelector />
          <PlatformEditor />

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || submitting || isProcessing}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(submitting || isProcessing) && <Loader2 className="animate-spin" size={18} />}
            {isProcessing ? "Génération des versions..." : "Générer les versions"}
          </button>
        </div>

        <div>
          {!job && (
            <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl p-10">
              Les versions générées pour chaque plateforme apparaîtront ici.
            </div>
          )}

          {job && (
            <div className="space-y-4">
              <VariantGrid variants={job.variants} />

              {isCompleted && (
                canPublish ? (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Send size={16} /> {publishing ? "Publication..." : "Publier sur les réseaux sélectionnés"}
                    </button>
                    {publishError && (
                      <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{publishError}</p>
                    )}
                    <p className="text-xs text-gray-400 text-center">
                      Publication simulée tant qu'aucune connexion API n'est configurée côté serveur.
                    </p>
                  </>
                ) : (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-3 text-center space-y-2">
                    <p className="text-sm text-amber-800">
                      Tes versions sont prêtes et téléchargeables gratuitement ci-dessus.
                      La publication directe sur les réseaux est réservée à Premium.
                    </p>
                    <Link
                      to="/pricing"
                      className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-600"
                    >
                      <Crown size={15} /> Passer Premium pour publier
                    </Link>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
