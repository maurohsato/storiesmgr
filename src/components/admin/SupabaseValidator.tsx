import React, { useState } from 'react';
import { SupabaseValidator, runSupabaseValidation, testUserCreation } from '../../utils/supabaseValidation';
import { CheckCircle, XCircle, AlertCircle, Play, User, Database, Shield, Settings, Mail, Zap } from 'lucide-react';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

const SupabaseValidatorComponent: React.FC = () => {
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [testResult, setTestResult] = useState<ValidationResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleValidation = async () => {
    setIsValidating(true);
    try {
      const report = await runSupabaseValidation();
      setValidationReport(report);
    } catch (error) {
      console.error('Erro na validação:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUserCreationTest = async () => {
    setIsTesting(true);
    try {
      const result = await testUserCreation();
      setTestResult(result);
    } catch (error) {
      console.error('Erro no teste:', error);
      setTestResult({
        success: false,
        message: `Erro no teste: ${error}`,
        details: error
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getSectionIcon = (section: string) => {
    const icons: Record<string, React.ReactNode> = {
      connection: <Database className="h-5 w-5" />,
      authentication: <Shield className="h-5 w-5" />,
      database: <Database className="h-5 w-5" />,
      rls: <Shield className="h-5 w-5" />,
      policies: <Settings className="h-5 w-5" />,
      triggers: <Zap className="h-5 w-5" />,
      emailSettings: <Mail className="h-5 w-5" />
    };
    return icons[section] || <AlertCircle className="h-5 w-5" />;
  };

  const getSectionName = (section: string) => {
    const names: Record<string, string> = {
      connection: 'Conexão',
      authentication: 'Autenticação',
      database: 'Banco de Dados',
      rls: 'Row Level Security',
      policies: 'Políticas de Segurança',
      triggers: 'Triggers e Funções',
      emailSettings: 'Configurações de Email'
    };
    return names[section] || section;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="h-6 w-6 mr-2 text-blue-600" />
            Validador do Supabase
          </h2>
          <p className="text-gray-600 mt-1">
            Valide todas as configurações necessárias para o funcionamento do sistema
          </p>
        </div>

        <div className="p-6">
          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={handleValidation}
              disabled={isValidating}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              {isValidating ? 'Validando...' : 'Executar Validação Completa'}
            </button>

            <button
              onClick={handleUserCreationTest}
              disabled={isTesting}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <User className="h-5 w-5 mr-2" />
              )}
              {isTesting ? 'Testando...' : 'Testar Criação de Usuário'}
            </button>
          </div>

          {/* Resultado da Validação */}
          {validationReport && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resultado da Validação
              </h3>
              
              {/* Status Geral */}
              <div className={`p-4 rounded-lg mb-4 ${
                validationReport.overall 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {getStatusIcon(validationReport.overall)}
                  <span className={`ml-2 font-medium ${
                    validationReport.overall ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Status Geral: {validationReport.overall ? 'APROVADO' : 'REQUER ATENÇÃO'}
                  </span>
                </div>
              </div>

              {/* Detalhes por Seção */}
              <div className="space-y-3">
                {Object.entries(validationReport)
                  .filter(([key]) => key !== 'overall')
                  .map(([section, result]: [string, any]) => (
                    <div
                      key={section}
                      className={`p-4 rounded-lg border ${
                        result.success 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex items-center mr-3">
                          {getSectionIcon(section)}
                          {getStatusIcon(result.success)}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            result.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {getSectionName(section)}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            result.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.message}
                          </p>
                          {result.details && !result.success && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                                Ver detalhes
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Resultado do Teste de Criação */}
          {testResult && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resultado do Teste de Criação de Usuário
              </h3>
              
              <div className={`p-4 rounded-lg border ${
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex items-center mr-3">
                    <User className="h-5 w-5" />
                    {getStatusIcon(testResult.success)}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Teste de Criação de Usuário
                    </h4>
                    <p className={`text-sm mt-1 ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              📋 Instruções para Configuração
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>1. Variáveis de Ambiente:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Verifique se VITE_SUPABASE_URL está correto</li>
                <li>Verifique se VITE_SUPABASE_ANON_KEY está correto</li>
              </ul>
              
              <p><strong>2. Configurações no Dashboard do Supabase:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Authentication → Settings → Desabilite "Enable email confirmations"</li>
                <li>Authentication → URL Configuration → Adicione suas URLs</li>
                <li>SQL Editor → Execute as migrações se necessário</li>
              </ul>
              
              <p><strong>3. Verificações de Segurança:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Certifique-se que RLS está habilitado em todas as tabelas</li>
                <li>Verifique se as políticas estão ativas</li>
                <li>Confirme que os triggers estão funcionando</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseValidatorComponent;