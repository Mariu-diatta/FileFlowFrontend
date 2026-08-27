import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Search } from "lucide-react";
import { tools as toolsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABELS = {
  pdf: "PDF",
  document: "Documents",
  etude: "Outils étudiants",
  audio: "Audio",
  video: "Vidéo",
  image: "Images",
  fichier: "Fichiers",
};

export default function Dashboard() {
  const [allTools, setAllTools] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    toolsApi.list().then(({ data }) => setAllTools(data)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return allTools.filter((t) => {
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || t.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [allTools, query, category]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((t) => {
      g[t.category] = g[t.category] || [];
      g[t.category].push(t);
    });
    return g;
  }, [filtered]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tous les outils</h1>
          <p className="text-gray-500 text-sm">
            {user ? `Bonjour ${user.username} — ${user.is_premium ? "compte Premium" : "compte gratuit"}` : "Choisis un outil pour commencer"}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un outil..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setCategory("all")}
          className={`px-3 py-1.5 rounded-full text-sm ${category === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Tous
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-3 py-1.5 rounded-full text-sm ${category === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400">Chargement du catalogue...</p>}

      {Object.entries(grouped).map(([cat, catTools]) => (
        <div key={cat} className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">{CATEGORY_LABELS[cat] || cat}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catTools.map((t) => (
              <Link
                key={t.slug}
                to={t.implemented ? `/tools/${t.slug}` : "#"}
                className={`border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition ${
                  !t.implemented ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {t.is_premium_only && <Lock size={16} className="text-amber-500 shrink-0 ml-2" />}
                </div>
                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                {!t.implemented && <span className="text-xs text-gray-400 italic">Bientôt disponible</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
