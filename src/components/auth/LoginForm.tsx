import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { LogIn, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
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
            Faça login na sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Acesse o sistema de gerenciamento de histórias
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

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
                  Entrar
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              Não tem uma conta? Cadastre-se
            </button>
          </div>
        </form>

        {/* Demo accounts info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Contas de Demonstração:</h3>
          <div className="text-xs text-blue-800 space-y-2">
            <div className="p-2 bg-white rounded border border-blue-100">
              <div><strong>👑 Administrador:</strong> admin@demo.com</div>
              <div className="text-blue-600">Senha: demo123</div>
              <div className="text-blue-500 text-xs">• Acesso total ao sistema</div>
            </div>
            <div className="p-2 bg-white rounded border border-blue-100">
              <div><strong>👨‍💼 Gerente:</strong> manager@demo.com</div>
              <div className="text-blue-600">Senha: demo123</div>
              <div className="text-blue-500 text-xs">• Gerencia projetos, times e clientes</div>
            </div>
            <div className="p-2 bg-white rounded border border-blue-100">
              <div><strong>✏️ Colaborador:</strong> collab@demo.com</div>
              <div className="text-blue-600">Senha: demo123</div>
              <div className="text-blue-500 text-xs">• Cria e edita histórias de usuário</div>
            </div>
            <div className="p-2 bg-white rounded border border-blue-100">
              <div><strong>👁️ Leitor:</strong> reader@demo.com</div>
              <div className="text-blue-600">Senha: demo123</div>
              <div className="text-blue-500 text-xs">• Apenas visualização</div>
            </div>
          </div>
        </div>

        {/* System status info */}
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-900 mb-2">
            ✅ Sistema Funcionando
          </h3>
          <div className="text-xs text-green-800 space-y-1">
            <p><strong>• SISTEMA OTIMIZADO:</strong></p>
            <p>• 🔐 Login com sessão persistente</p>
            <p>• ⚡ Carregamento rápido</p>
            <p>• ✅ Autenticação simplificada com email/senha</p>
            <p>• Dados protegidos com Row Level Security</p>
            <p>• 🚪 Botão de logout disponível no menu do usuário</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;