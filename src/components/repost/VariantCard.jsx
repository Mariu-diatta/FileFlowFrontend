import { Download, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const PLATFORM_LABELS = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts",
  linkedin: "LinkedIn", facebook: "Facebook", x: "X (Twitter)",
};

const FILTER_LABELS = {
  none: null,
  noir_blanc: "Noir & blanc",
  sepia: "Sépia",
  vintage: "Vintage",
  contraste: "Contraste +",
  chaud: "Ton chaud",
  froid: "Ton froid",
};

const STATUS_META = {
  queued: { icon: Clock, label: "En attente", color: "text-gray-400" },
  processing: { icon: Loader2, label: "Traitement...", color: "text-blue-500 animate-spin" },
  completed: { icon: CheckCircle2, label: "Prête", color: "text-green-500" },
  failed: { icon: AlertCircle, label: "Échec", color: "text-red-500" },
};

export function VariantCard({ variant }) {
  const meta = STATUS_META[variant.status] || STATUS_META.queued;
  const StatusIcon = meta.icon;

  return (
    <article className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <strong className="text-sm">{PLATFORM_LABELS[variant.platform] || variant.platform}</strong>
        <div className="flex items-center gap-2">
          {FILTER_LABELS[variant.filter_name] && (
            <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {FILTER_LABELS[variant.filter_name]}
            </span>
          )}
          <span className="text-xs text-gray-400">{variant.width} × {variant.height}</span>
        </div>
      </header>

      <div className="bg-black flex items-center justify-center aspect-video">
        {variant.outputUrl ? (
          <video src={variant.outputUrl} controls className="max-h-56 w-full" />
        ) : (
          <div className="text-white/70 text-sm flex items-center gap-2 py-8">
            <StatusIcon size={16} className={meta.color} /> {meta.label}
          </div>
        )}
      </div>

      {variant.status === "failed" && variant.error_message && (
        <p className="text-xs text-red-600 px-3 py-2 bg-red-50">{variant.error_message.slice(0, 140)}</p>
      )}

      <footer className="flex items-center justify-between px-3 py-2 text-sm">
        <span className="text-gray-500">{variant.duration ? `${variant.duration.toFixed(1)} s` : "—"}</span>
        {variant.outputUrl && (
          <a
            href={variant.outputUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="text-blue-600 flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <Download size={14} /> Télécharger
          </a>
        )}
      </footer>

      {variant.published && (
        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5">{variant.publish_note}</p>
      )}
    </article>
  );
}
