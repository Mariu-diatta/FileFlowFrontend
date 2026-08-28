import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { billing, auth as authApi } from "../api/client";
import { Crown, Trash2, AlertTriangle } from "lucide-react";

export default function Account() {
  const { user, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      logout();
      navigate("/");
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Erreur lors de la suppression du compte.");
    } finally {
      setDeleting(false);
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
          className="mt-6 text-sm text-red-600 hover:underline disabled:opacity-50 block"
        >
          Résilier mon abonnement Premium
        </button>
      )}

      {/* --- Zone de suppression de compte --- */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
          <AlertTriangle size={16} /> Zone de danger
        </h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50"
          >
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-800">
              Cette action est <strong>définitive</strong> : ton compte, tes campagnes et tes
              commentaires seront supprimés sans possibilité de retour.
            </p>
            <input
              type="password"
              required
              placeholder="Confirme avec ton mot de passe"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm"
            />
            {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
