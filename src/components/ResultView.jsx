import { CheckCircle2 } from "lucide-react";

function humanize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function ValueBlock({ value }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {value ? "Oui" : "Non"}
      </span>
    );
  }

  if (typeof value === "number" || typeof value === "string") {
    const text = String(value);
    if (text.length > 120 || text.includes("\n")) {
      return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>;
    }
    return <span className="text-sm text-gray-800 font-medium">{text}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400 italic">Aucun élément</span>;

    const allSimple = value.every((v) => !isPlainObject(v) && !Array.isArray(v));
    if (allSimple) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }

    const columns = Array.from(
      value.reduce((set, row) => {
        if (isPlainObject(row)) Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg mt-1">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                  {humanize(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {value.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 text-gray-700 align-top">
                    {isPlainObject(row?.[c]) || Array.isArray(row?.[c]) ? (
                      <ValueBlock value={row[c]} />
                    ) : (
                      String(row?.[c] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2 mt-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-medium text-gray-500 mb-0.5">{humanize(k)}</div>
            <ValueBlock value={v} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-gray-800">{String(value)}</span>;
}

// Affiche le résultat d'un outil (habituellement du JSON renvoyé par le
// backend) sous forme de cartes et de tableaux HTML lisibles, plutôt que du
// JSON brut. Reconnaît automatiquement les tableaux d'objets (-> tableau),
// les listes simples (-> puces), les objets imbriqués (-> sous-cartes) et
// le texte long (-> paragraphe).
export default function ResultView({ data }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <ValueBlock value={data} />
      </div>
    );
  }

  if (!isPlainObject(data)) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
        {String(data)}
      </div>
    );
  }

  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 size={18} />
        <span className="font-medium text-sm">Résultat du traitement</span>
      </div>
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {humanize(key)}
          </div>
          <ValueBlock value={value} />
        </div>
      ))}
    </div>
  );
}
