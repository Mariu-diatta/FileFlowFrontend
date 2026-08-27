import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { billing } from "../api/client";
import { Crown } from "lucide-react";

export default function Account() {
  const { user, refreshMe } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      await billing.cancel();
      await refreshMe();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Mon compte</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Nom d'utilisateur</span>
          <span className="font-medium">{user.username}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Email</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-gray-500">Plan</span>
          <span className={`font-medium flex items-center gap-1 ${user.is_premium ? "text-amber-600" : ""}`}>
            {user.is_premium && <Crown size={14} />}
            {user.is_premium ? "Premium" : "Gratuit"}
          </span>
        </div>
        {!user.is_premium && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Opérations aujourd'hui</span>
            <span className="font-medium">{user.daily_operations_count} / 8</span>
          </div>
        )}
        {user.is_premium && user.premium_until && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Premium jusqu'au</span>
            <span className="font-medium">{new Date(user.premium_until).toLocaleDateString("fr-FR")}</span>
          </div>
        )}
      </div>

      {user.is_premium && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="mt-6 text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Résilier mon abonnement Premium
        </button>
      )}
    </div>
  );
}
