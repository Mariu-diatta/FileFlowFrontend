import { useEffect, useState } from "react";
import { Star, Trash2, MessageSquare } from "lucide-react";
import { commentsApi } from "../api/comments";
import { useAuth } from "../context/AuthContext";

export default function ToolComments({ slug }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    commentsApi.list(slug).then(({ data }) => {
      setComments(data.comments);
      setAverageRating(data.average_rating);
    });
  };

  useEffect(() => { load(); }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await commentsApi.create(slug, text.trim(), rating || null);
      setText("");
      setRating(0);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await commentsApi.remove(id);
    load();
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <MessageSquare size={16} /> Avis ({comments.length})
        {averageRating && (
          <span className="text-sm text-amber-600 flex items-center gap-1 font-normal">
            <Star size={14} className="fill-amber-500 text-amber-500" /> {averageRating}/5
          </span>
        )}
      </h3>

      {user && (
        <form onSubmit={handleSubmit} className="mb-5 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Partage ton avis sur cet outil..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-2"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setRating(n === rating ? 0 : n)}>
                  <Star size={18} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Publier
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">Aucun avis pour le moment — sois le premier !</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.username}</span>
                {c.rating && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: c.rating }).map((_, i) => (
                      <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                )}
              </div>
              {c.is_owner && (
                <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
