import { useEffect, useState } from "react";
import { Check, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { billing } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Pricing() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    billing.pricing().then(({ data }) => setPlans(data));
  }, []);

  const handleUpgrade = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      await billing.checkout();
      await refreshMe();
      setMessage("Bienvenue dans FileFlow Premium ! 🎉");
    } catch {
      setMessage("Erreur lors du paiement (simulation).");
    } finally {
      setLoading(false);
    }
  };

  if (!plans) return <div className="text-center py-16 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-bold text-center mb-2">Choisis ton offre</h1>
      <p className="text-center text-gray-500 mb-10">Passe à l'étape supérieure quand tu en as besoin.</p>

      {message && (
        <div className="max-w-md mx-auto mb-8 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-center">
          {message}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-1">Gratuit</h2>
          <p className="text-3xl font-bold mb-4">0 € <span className="text-sm text-gray-400 font-normal">/ toujours</span></p>
          <ul className="space-y-2 mb-6">
            {plans.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-green-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!user && <p className="text-sm text-gray-400">Crée un compte pour commencer.</p>}
        </div>

        <div className="border-2 border-amber-400 rounded-2xl p-6 relative bg-amber-50/40">
          <span className="absolute -top-3 left-6 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Crown size={12} /> RECOMMANDÉ
          </span>
          <h2 className="text-lg font-semibold mb-1">Premium</h2>
          <p className="text-3xl font-bold mb-4">
            {plans.premium.price} € <span className="text-sm text-gray-400 font-normal">/ {plans.premium.period}</span>
          </p>
          <ul className="space-y-2 mb-6">
            {plans.premium.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-green-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading || user?.is_premium}
            className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {user?.is_premium ? "Déjà Premium ✓" : loading ? "Traitement..." : "Passer Premium (paiement simulé)"}
          </button>
        </div>
      </div>
    </div>
  );
}
