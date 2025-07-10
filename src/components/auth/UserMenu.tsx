import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { User, LogOut, Settings, ChevronDown, Shield, QrCode, X, Key, Eye, EyeOff } from 'lucide-react';

const UserMenu: React.FC = () => {
  const { profile, signOut, mfaEnabled, enableMFA, verifyMFA, disableMFA, changePassword } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!profile) return null;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      project_manager: 'Gerente de Projeto',
      collaborator: 'Colaborador',
      reader: 'Leitor',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      project_manager: 'bg-blue-100 text-blue-800',
      collaborator: 'bg-green-100 text-green-800',
      reader: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEnableMFA = async () => {
    try {
      setMfaLoading(true);
      setMfaError('');
      const { secret, qrCode } = await enableMFA();
      setMfaSecret(secret);
      setQrCode(qrCode);
      setShowMFASetup(true);
    } catch (error) {
      setMfaError('Erro ao configurar MFA');
      console.error('MFA setup error:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMfaError('Digite um código de 6 dígitos');
      return;
    }

    try {
      setMfaLoading(true);
      setMfaError('');
      const isValid = await verifyMFA(verificationCode);
      
      if (isValid) {
        setShowMFASetup(false);
        setVerificationCode('');
        alert('MFA ativado com sucesso!');
      } else {
        setMfaError('Código inválido. Verifique o código no seu Google Authenticator.');
      }
    } catch (error) {
      setMfaError('Erro ao verificar código MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    const code = prompt('Digite o código do Google Authenticator para desativar o MFA:');
    if (!code) return;

    try {
      await disableMFA(code);
      alert('MFA desativado com sucesso!');
    } catch (error) {
      alert('Código inválido ou erro ao desativar MFA');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Senha alterada com sucesso!');
    } catch (error: any) {
      setPasswordError(error.message || 'Erro ao alterar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 p-2 hover:bg-orange-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="h-4 w-4 text-orange-600" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900">
              {profile.full_name || profile.email}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              {getRoleLabel(profile.role)}
              {mfaEnabled && <Shield className="h-3 w-3 ml-1 text-green-600" />}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {profile.email}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}>
                        {getRoleLabel(profile.role)}
                      </span>
                      {mfaEnabled && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Shield className="h-3 w-3 mr-1" />
                          MFA Ativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* Password Change */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowPasswordChange(true);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Key className="h-4 w-4 mr-3" />
                  Alterar Senha
                </button>

                {/* MFA Settings */}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Segurança
                    </p>
                  </div>
                  
                  {/* MFA Status */}
                  <div className="px-4 py-2 bg-red-50 border-l-4 border-red-400">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-red-600 mr-2" />
                      <p className="text-xs text-red-800 font-medium">
                        MFA OBRIGATÓRIO para todos os usuários
                      </p>
                    </div>
                    {!mfaEnabled && (
                      <p className="text-xs text-red-700 mt-1">
                        ⚠️ Configure o MFA para manter acesso ao sistema
                      </p>
                    )}
                  </div>
                  
                  {!mfaEnabled ? (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleEnableMFA();
                      }}
                      disabled={mfaLoading}
                      className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      <Shield className="h-4 w-4 mr-3" />
                      Configurar Autenticação 2FA
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleDisableMFA();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Shield className="h-4 w-4 mr-3" />
                      Reconfigurar Autenticação 2FA
                    </button>
                  )}
                </div>
                
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Alterar Senha
              </h3>
              <button
                onClick={() => setShowPasswordChange(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Digite a nova senha (mín. 6 caracteres)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Confirme a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {passwordError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MFA Setup Modal */}
      {showMFASetup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Configurar Autenticação 2FA
              </h3>
              <button
                onClick={() => setShowMFASetup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">1. Instale o Google Authenticator no seu celular</p>
                <p className="mb-2">2. Escaneie o QR Code abaixo ou digite o código manualmente</p>
                <p>3. Digite o código de 6 dígitos para confirmar</p>
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
                        <p className="text-xs text-gray-500">
                          Gerando QR Code...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de verificação:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest"
                  placeholder="000000"
                />
              </div>

              {mfaError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {mfaError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMFASetup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerifyMFA}
                  disabled={mfaLoading || verificationCode.length !== 6}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaLoading ? 'Verificando...' : 'Ativar MFA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;