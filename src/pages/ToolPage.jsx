import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { tools as toolsApi } from "../api/client";
import toolConfig from "../toolConfig";
import { useAuth } from "../context/AuthContext";
import ToolComments from "../components/ToolComments";
import FileSlotManager from "../components/FileSlotManager";
import ResultPreview from "../components/ResultPreview";
import ResultView from "../components/ResultView";

export default function ToolPage() {
  const { slug } = useParams();
  const { user, refreshMe } = useAuth();
  const [toolMeta, setToolMeta] = useState(null);
  const [files, setFiles] = useState([]);
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFilename, setResultFilename] = useState("");
  const [resultContentType, setResultContentType] = useState("");
  const [resultJson, setResultJson] = useState(null);

  const config = toolConfig[slug] || { fields: [] };

  useEffect(() => {
    toolsApi.list().then(({ data }) => {
      setToolMeta(data.find((t) => t.slug === slug) || null);
    });
    const initial = {};
    (config.fields || []).forEach((f) => {
      if (f.default !== undefined) initial[f.name] = f.default;
    });
    setParams(initial);
    setFiles([]);
    setResultUrl(null);
    setResultJson(null);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleParamChange = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleRun = async () => {
    if (files.length === 0) {
      setError("Merci de choisir au moins un fichier.");
      return;
    }
    setLoading(true);
    setError("");
    setResultUrl(null);
    setResultJson(null);
    try {
      const response = await toolsApi.run(slug, files, params);
      const contentType = response.headers["content-type"] || "";

      if (response.status >= 400) {
        const text = await response.data.text();
        try {
          setError(JSON.parse(text).error || "Erreur lors du traitement.");
        } catch {
          setError("Erreur lors du traitement.");
        }
        return;
      }

      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        setResultJson(JSON.parse(text));
      } else {
        const disposition = response.headers["content-disposition"] || "";
        const match = disposition.match(/filename="?([^"]+)"?/);
        setResultFilename(match ? match[1] : "resultat");
        setResultContentType(contentType);
        setResultUrl(URL.createObjectURL(response.data));
      }
      refreshMe();
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!toolMeta) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-gray-400">Chargement...</div>;
  }

  const locked = toolMeta.is_premium_only && !user?.is_premium;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Retour au catalogue
      </Link>

      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        {toolMeta.name}
        {toolMeta.is_premium_only && <Lock size={18} className="text-amber-500" />}
      </h1>
      <p className="text-gray-500 mb-6">{toolMeta.description}</p>

      {locked ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Lock className="mx-auto mb-2 text-amber-500" size={28} />
          <p className="font-medium text-amber-800">Cet outil est réservé aux membres Premium.</p>
          <Link to="/pricing" className="inline-block mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600">
            Découvrir Premium
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <FileSlotManager
            multiple={config.multiple}
            files={files}
            onFiles={setFiles}
            labels={config.fileLabels}
            orderHint={config.orderHint || (config.multiple && !config.fileLabels ? "Glisse une carte pour changer l'ordre de traitement." : undefined)}
            label={`Glisse-dépose ${config.multiple ? "un ou plusieurs fichiers" : "un fichier"} ici, clique pour parcourir, ou importe depuis un lien`}
          />

          {(config.fields || []).map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={params[f.name] ?? f.default ?? ""}
                  onChange={(e) => handleParamChange(f.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {f.options.map((opt) => {
                    const [val, label] = Array.isArray(opt) ? opt : [opt, opt];
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>
              ) : (
                <input
                  type={f.type}
                  step={f.step}
                  placeholder={f.placeholder}
                  value={params[f.name] ?? ""}
                  onChange={(e) => handleParamChange(f.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? "Traitement en cours..." : "Lancer le traitement"}
          </button>

          {resultUrl && (
            <ResultPreview resultUrl={resultUrl} suggestedFilename={resultFilename} contentType={resultContentType} />
          )}

          {resultJson && <ResultView data={resultJson} />}
        </div>
      )}

      <ToolComments slug={slug} />
    </div>
  );
}
