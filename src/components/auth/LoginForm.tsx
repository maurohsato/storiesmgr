import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { LogIn, Eye, EyeOff, Loader2, Shield, AlertTriangle, QrCode, X } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const { signIn, enableMFA, verifyMFA } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [needsMFASetup, setNeedsMFASetup] = useState(false);
  
  // MFA Setup states
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [tempUserId, setTempUserId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password, mfaCode);
    } catch (err: any) {
      console.log('Login error:', err.message);
      
      if (err.message === 'MFA_REQUIRED') {
        setRequiresMFA(true);
        setError('');
      } else if (err.message === 'MFA_SETUP_REQUIRED') {
        setNeedsMFASetup(true);
        setError('');
        // Iniciar configuração do MFA
        await handleMFASetup();
      } else {
        setError(err.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFASetup = async () => {
    try {
      setMfaLoading(true);
      setError('');
      
      // Para configurar MFA, precisamos simular um login temporário
      // Vamos usar localStorage para armazenar temporariamente
      const tempUserId = `temp_${Date.now()}`;
      setTempUserId(tempUserId);
      
      // Gerar secret e QR code
      const secret = generateMFASecret();
      const qrCodeUrl = generateQRCode(email, secret);
      
      setMfaSecret(secret);
      setQrCode(qrCodeUrl);
      
      // Salvar temporariamente
      localStorage.setItem(`temp_mfa_secret_${email}`, secret);
      
    } catch (error) {
      setError('Erro ao configurar MFA. Tente novamente.');
      console.error('MFA setup error:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  // Função para gerar secret MFA
  const generateMFASecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Função para gerar QR Code URL
  const generateQRCode = (email: string, secret: string) => {
    const issuer = 'User Stories Manager';
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
  };

  // Função para verificar código TOTP
  const verifyTOTP = (token: string, secret: string) => {
    // Implementação simplificada do TOTP
    const time = Math.floor(Date.now() / 1000 / 30);
    
    // Para demonstração, vamos aceitar alguns códigos específicos
    // Em produção, você usaria uma biblioteca como otplib
    const validCodes = ['123456', '000000', '111111'];
    
    // Simular validação baseada no tempo
    const timeBasedCode = String(time % 1000000).padStart(6, '0');
    
    return validCodes.includes(token) || token === timeBasedCode;
  };

  const handleMFASetupVerification = async () => {
    if (!setupCode || setupCode.length !== 6) {
      setError('Digite um código de 6 dígitos');
      return;
    }

    try {
      setMfaLoading(true);
      setError('');
      
      const tempSecret = localStorage.getItem(`temp_mfa_secret_${email}`);
      if (!tempSecret) {
        setError('Secret MFA não encontrado. Reinicie o processo.');
        return;
      }
      
      // Verificar código (implementação simplificada)
      const isValid = verifyTOTP(setupCode, tempSecret);
      
      if (isValid) {
        // MFA configurado com sucesso
        localStorage.setItem(`supabase_mfa_${email}`, 'true');
        localStorage.setItem(`supabase_mfa_secret_${email}`, tempSecret);
        localStorage.removeItem(`temp_mfa_secret_${email}`);
        
        // Agora pedir o código para login
        setNeedsMFASetup(false);
        setRequiresMFA(true);
        setSetupCode('');
        setMfaCode('');
        alert('MFA configurado com sucesso! Agora digite o código para fazer login.');
      } else {
        setError('Código inválido. Tente: 123456, 000000 ou 111111 para demonstração.');
      }
    } catch (error) {
      setError('Erro ao verificar código MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setRequiresMFA(false);
    setNeedsMFASetup(false);
    setMfaCode('');
    setSetupCode('');
    setError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  // MFA Setup Modal
  if (needsMFASetup) {
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
              Configurar Autenticação 2FA
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              MFA é obrigatório para todos os usuários
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800 font-medium">
                  🔒 Autenticação de Dois Fatores Obrigatória
                </p>
              </div>
              <p className="text-xs text-red-700 mt-2">
                Para sua segurança, todos os usuários devem configurar MFA antes de acessar o sistema.
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>📱 Passos para configurar:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Instale o Google Authenticator no seu celular</li>
                <li>Escaneie o QR Code abaixo ou digite o código manualmente</li>
                <li>Digite o código de 6 dígitos para confirmar</li>
              </ol>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white border-2 border-gray-300 p-2 rounded-lg">
                {qrCode ? (
                  <img 
                    src={qrCode} 
                    alt="QR Code para Google Authenticator"
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-white flex items-center justify-center border border-gray-200 rounded">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Gerando QR Code...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Manual entry code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código para configuração manual:
              </label>
              <div className="flex mb-2">
                <input
                  type="text"
                  value={mfaSecret.match(/.{1,4}/g)?.join(' ') || mfaSecret}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-xs font-mono"
                />
                <button
                  onClick={() => copyToClipboard(mfaSecret)}
                  className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Verification code input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de verificação:
              </label>
              <input
                type="text"
                maxLength={6}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest"
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para demonstração, use: <strong>123456</strong>, <strong>000000</strong> ou <strong>111111</strong>
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleBackToCredentials}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleMFASetupVerification}
                disabled={mfaLoading || setupCode.length !== 6}
                className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mfaLoading ? 'Verificando...' : 'Configurar MFA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  Digite o código de 6 dígitos do Google Authenticator
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  Para demonstração, use: <strong>123456</strong>, <strong>000000</strong> ou <strong>111111</strong>
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
              disabled={loading || (requiresMFA && mfaCode.length !== 6)}
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
        {!requiresMFA && !needsMFASetup && (
          <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="text-sm font-medium text-red-900 mb-2">
              🔒 Segurança Obrigatória
            </h3>
            <div className="text-xs text-red-800 space-y-1">
              <p><strong>• MFA OBRIGATÓRIO para TODOS os usuários</strong></p>
              <p>• Primeira vez? Configure Google Authenticator</p>
              <p>• Dados protegidos com Row Level Security</p>
              <p>• Sessões expiram em 30 minutos de inatividade</p>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <p className="text-xs text-yellow-800">
                  <strong>Primeira vez?</strong> Você será guiado para configurar o MFA após inserir suas credenciais.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;