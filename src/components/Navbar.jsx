import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileStack, Crown, LogOut, User, Sparkles, Wrench, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-2">
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 font-bold text-xl text-blue-600 shrink-0">
            <FileStack size={26} />
            FileFlow
          </Link>

          {/* Liens desktop — masqués sur mobile, remplacés par le menu burger */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <Wrench size={16} /> Outils
            </Link>
            <Link to="/repost-studio" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <Sparkles size={16} className="text-blue-500" /> Multi-publication
            </Link>
            <Link to="/pricing" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <Crown size={16} className="text-amber-500" /> Premium
            </Link>

            {user ? (
              <>
                {user.is_premium ? (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap">
                    PREMIUM
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {user.daily_operations_count}/8 aujourd'hui
                  </span>
                )}
                <Link to="/account" className="text-gray-600 hover:text-blue-600">
                  <User size={20} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600"
                  title="Se déconnecter"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* Bouton burger — visible uniquement sur mobile/tablette */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-gray-600 hover:text-blue-600 p-1.5 -mr-1.5"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Panneau mobile déroulant */}
        {open && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1">
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg px-2 py-2.5 text-sm font-medium"
            >
              <Wrench size={18} /> Outils
            </Link>
            <Link
              to="/repost-studio"
              onClick={closeMenu}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg px-2 py-2.5 text-sm font-medium"
            >
              <Sparkles size={18} className="text-blue-500" /> Multi-publication
            </Link>
            <Link
              to="/pricing"
              onClick={closeMenu}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg px-2 py-2.5 text-sm font-medium"
            >
              <Crown size={18} className="text-amber-500" /> Premium
            </Link>

            <div className="border-t border-gray-100 my-1" />

            {user ? (
              <>
                <div className="px-2 py-1.5 text-xs text-gray-500 flex items-center gap-2">
                  {user.is_premium ? (
                    <span className="font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">PREMIUM</span>
                  ) : (
                    <span>{user.daily_operations_count}/8 opérations aujourd'hui</span>
                  )}
                </div>
                <Link
                  to="/account"
                  onClick={closeMenu}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg px-2 py-2.5 text-sm font-medium"
                >
                  <User size={18} /> Mon compte
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg px-2 py-2.5 text-sm font-medium text-left"
                >
                  <LogOut size={18} /> Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg px-2 py-2.5 text-sm font-medium"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="bg-blue-600 text-white rounded-lg px-3 py-2.5 text-sm font-medium text-center mt-1"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
