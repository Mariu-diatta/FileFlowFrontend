import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ToolPage from "./pages/ToolPage";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import RepostStudio from "./pages/RepostStudio";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-16 text-gray-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            {/* Le catalogue, les outils et la multi-publication ne nécessitent
                pas de compte : seuls les outils marqués "is_premium_only"
                (modèles d'IA) sont bloqués, indépendamment de la connexion —
                voir ToolPage et le backend (tools/permissions.py). */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tools/:slug" element={<ToolPage />} />
            <Route path="/repost-studio" element={<RepostStudio />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <footer className="text-center text-xs text-gray-400 py-6">
          FileFlow — Projet démo Django + React
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
