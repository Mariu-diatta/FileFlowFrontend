import { Link } from "react-router-dom";
import { FileStack, Zap, ShieldCheck, Crown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <FileStack size={16} /> Plus de 45 outils en un seul endroit
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Tous tes outils PDF, audio, vidéo,<br />images et fichiers — au même endroit
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-8">
          Fusionne, compresse, convertis, transcris, résume : pensé pour les étudiants et tous ceux
          qui jonglent avec des fichiers au quotidien.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto text-center bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700"
          >
            Utiliser les outils gratuitement
          </Link>
          {!user && (
            <Link
              to="/register"
              className="w-full sm:w-auto text-center text-gray-700 font-medium px-6 py-3 hover:text-blue-600"
            >
              Créer un compte
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Aucun compte requis pour les outils gratuits. Un compte débloque des limites plus hautes,
          et Premium ajoute les outils IA.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20 grid sm:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap size={22} />
          </div>
          <h3 className="font-semibold mb-1">Rapide</h3>
          <p className="text-sm text-gray-500">Traitement direct sur le serveur, aucun logiciel à installer.</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} />
          </div>
          <h3 className="font-semibold mb-1">Fiable</h3>
          <p className="text-sm text-gray-500">Tes fichiers sont traités puis supprimés du serveur.</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Crown size={22} />
          </div>
          <h3 className="font-semibold mb-1">Premium sans limite</h3>
          <p className="text-sm text-gray-500">Fichiers plus lourds, aucun filigrane, outils avancés débloqués.</p>
        </div>
      </section>
    </div>
  );
}
