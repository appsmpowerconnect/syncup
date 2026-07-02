import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Calendar, Users, Shield, ArrowRight } from 'lucide-react';

export default function AuthView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Erro durante o login do Google:", err);
      setError("Falha ao entrar com Google. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8" id="auth-view">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100" id="auth-card">
        {/* Logo and Greeting */}
        <div className="text-center" id="auth-header">
          <div className="mx-auto h-16 w-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Calendar className="h-9 w-9" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            SyncUp
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sincronize sua agenda, crie grupos e agende reuniões sem complicações.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-4 py-4" id="auth-features">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600 mt-0.5">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Defina sua disponibilidade</h4>
              <p className="text-xs text-slate-500">Defina seus horários de trabalho e pessoais para que os outros saibam quando você está livre.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 mt-0.5">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Grupos de Sincronia</h4>
              <p className="text-xs text-slate-500">Reúna sua equipe, família ou amigos e veja onde as agendas se sobrepõem instantaneamente.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Autenticação Segura</h4>
              <p className="text-xs text-slate-500">Conecte-se com segurança por meio da autenticação do Google.</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded-r-xl" id="auth-error">
            {error}
          </div>
        )}

        {/* Call to Action */}
        <div id="auth-cta">
          <button
            id="google-signin-btn"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-150 shadow-sm items-center space-x-3"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-5.84-4.53z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Entrar com o Google</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6" id="auth-footer">
          SyncUp v1.0.0 • Hospedado com segurança
        </div>
      </div>
    </div>
  );
}
