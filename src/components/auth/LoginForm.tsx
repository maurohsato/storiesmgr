import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { LogIn, Eye, EyeOff, Loader2, Shield } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password, mfaCode);
    } catch (err: any) {
      if (err.message === 'MFA_REQUIRED') {
        setRequiresMFA(true);
        setError('');
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        setError('Email ou senha incorretos. Verifique suas credenciais ou crie uma nova conta.');
      } else {
        setError(err.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setRequiresMFA(false);
    setMfaCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="/image.png" 
            alt="Inectar Logo" 
            className="mx-auto h-16 w-auto"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {requiresMFA ? 'Verificação MFA' : 'Faça login na sua conta'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {requiresMFA 
              ? 'Digite o código do seu Google Authenticator'
              : 'Acesse o sistema de gerenciamento de histórias'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {!requiresMFA ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Sua senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-orange-600 mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  Autenticação de dois fatores ativada para <strong>{email}</strong>
                </p>
              </div>
              
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700">
                  Código do Google Authenticator
                </label>
                <input
                  id="mfaCode"
                  name="mfaCode"
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-center text-lg tracking-widest"
                  placeholder="000000"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Digite o código de 6 dígitos do seu aplicativo autenticador
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleBackToCredentials}
                className="w-full text-sm text-orange-600 hover:text-orange-500"
              >
                ← Voltar para credenciais
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {requiresMFA ? 'Verificar Código' : 'Entrar'}
                </>
              )}
            </button>
          </div>

          {!requiresMFA && (
            <div className="text-center">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-sm text-orange-600 hover:text-orange-500"
              >
                Não tem uma conta? Cadastre-se
              </button>
            </div>
          )}
        </form>

        {/* System status info */}
        {!requiresMFA && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              ✅ Sistema Conectado ao Supabase
            </h3>
            <div className="text-xs text-green-800 space-y-1">
              <p>• Autenticação em tempo real</p>
              <p>• Dados salvos no banco PostgreSQL</p>
              <p>• Row Level Security (RLS) ativo</p>
              <p>• Sessões com timeout de 5 minutos</p>
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>🔐 MFA Disponível:</strong> Configure autenticação de dois fatores 
                no menu do usuário após fazer login.
              </p>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>👤 Primeira vez?</strong> Se você não tem uma conta, clique em "Cadastre-se" 
                para criar uma nova conta. Para administradores: acesse /supabase-validation para 
                verificar a configuração do sistema.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;