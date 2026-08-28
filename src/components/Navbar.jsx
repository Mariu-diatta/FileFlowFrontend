import { Link, useNavigate } from "react-router-dom";
import { FileStack, Crown, LogOut, User, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <FileStack size={26} />
          FileFlow
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link to="/repost-studio" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <Sparkles size={16} className="text-blue-500" /> Multi-publication
            </Link>
          )}
          <Link to="/pricing" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
            <Crown size={16} className="text-amber-500" /> Premium
          </Link>

          {user ? (
            <>
              {user.is_premium ? (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  PREMIUM
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  {user.daily_operations_count}/8 aujourd'hui
                </span>
              )}
              <Link to="/account" className="text-gray-600 hover:text-blue-600">
                <User size={20} />
              </Link>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-gray-500 hover:text-red-600"
                title="Se déconnecter"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                Connexion
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
