import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CheckCircle, RefreshCw, User, Database } from 'lucide-react';

const AuthDiagnostic: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const results: any = {
        timestamp: new Date().toISOString(),
        auth: {},
        profile: {},
        supabase: {},
        permissions: {}
      };

      // 1. Verificar estado da autenticação
      const { data: { session } } = await supabase.auth.getSession();
      results.auth = {
        hasSession: !!session,
        sessionUser: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at
        } : null,
        hookUser: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        loading
      };

      // 2. Verificar perfil no Supabase
      if (session?.user) {
        try {
          const { data: dbProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          results.profile = {
            fromSupabase: dbProfile,
            error: error?.message,
            fromHook: profile
          };
        } catch (error) {
          results.profile.error = error;
        }
      }

      // 3. Verificar conectividade com Supabase
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        results.supabase = {
          connected: !error,
          error: error?.message,
          canQuery: !!data
        };
      } catch (error) {
        results.supabase = {
          connected: false,
          error: error
        };
      }

      // 4. Verificar permissões se tiver perfil
      if (profile) {
        results.permissions = {
          role: profile.role,
          isAdmin: profile.role === 'admin',
          isManager: ['admin', 'project_manager'].includes(profile.role),
          isCollaborator: ['admin', 'project_manager', 'collaborator'].includes(profile.role),
          isReader: profile.role === 'reader'
        };
      }

      setDiagnosticData(results);
    } catch (error) {
      setDiagnosticData({
        error: error,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, [user, profile]);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  if (!diagnosticData) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span>Executando diagnóstico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Diagnóstico de Autenticação</h3>
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {diagnosticData.error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="font-medium text-red-900">Erro no Diagnóstico</span>
          </div>
          <pre className="text-sm text-red-700 overflow-x-auto">
            {JSON.stringify(diagnosticData.error, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Estado da Autenticação */}
          <div className="p-4 bg-white border rounded-lg">
            <div className="flex items-center mb-3">
              <User className="h-5 w-5 mr-2" />
              <h4 className="font-medium">Estado da Autenticação</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                {getStatusIcon(diagnosticData.auth.hasSession)}
                <span className="ml-2">Sessão ativa: {diagnosticData.auth.hasSession ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(!!diagnosticData.auth.sessionUser)}
                <span className="ml-2">Usuário na sessão: {diagnosticData.auth.sessionUser?.email || 'Nenhum'}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(!!diagnosticData.auth.hookUser)}
                <span className="ml-2">Usuário no hook: {diagnosticData.auth.hookUser?.email || 'Nenhum'}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(!diagnosticData.auth.loading)}
                <span className="ml-2">Loading: {diagnosticData.auth.loading ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </div>

          {/* Estado do Perfil */}
          <div className="p-4 bg-white border rounded-lg">
            <div className="flex items-center mb-3">
              <Database className="h-5 w-5 mr-2" />
              <h4 className="font-medium">Estado do Perfil</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                {getStatusIcon(!!diagnosticData.profile.fromSupabase && !diagnosticData.profile.error)}
                <span className="ml-2">Perfil no Supabase: {diagnosticData.profile.fromSupabase?.email || 'Não encontrado'}</span>
              </div>
              {diagnosticData.profile.fromSupabase && (
                <div className="ml-6 text-xs text-gray-600">
                  Role: {diagnosticData.profile.fromSupabase.role}
                </div>
              )}
              <div className="flex items-center">
                {getStatusIcon(!!diagnosticData.profile.fromHook)}
                <span className="ml-2">Perfil no hook: {diagnosticData.profile.fromHook?.email || 'Não carregado'}</span>
              </div>
              {diagnosticData.profile.error && (
                <div className="text-red-600 text-xs">
                  Erro: {diagnosticData.profile.error}
                </div>
              )}
            </div>
          </div>

          {/* Conectividade Supabase */}
          <div className="p-4 bg-white border rounded-lg">
            <div className="flex items-center mb-3">
              <Database className="h-5 w-5 mr-2" />
              <h4 className="font-medium">Conectividade Supabase</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                {getStatusIcon(diagnosticData.supabase.connected)}
                <span className="ml-2">Conectado: {diagnosticData.supabase.connected ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(diagnosticData.supabase.canQuery)}
                <span className="ml-2">Pode consultar: {diagnosticData.supabase.canQuery ? 'Sim' : 'Não'}</span>
              </div>
              {diagnosticData.supabase.error && (
                <div className="text-red-600 text-xs">
                  Erro: {diagnosticData.supabase.error}
                </div>
              )}
            </div>
          </div>

          {/* Permissões */}
          {diagnosticData.permissions.role && (
            <div className="p-4 bg-white border rounded-lg">
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 mr-2" />
                <h4 className="font-medium">Permissões</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div>Role atual: <span className="font-medium">{diagnosticData.permissions.role}</span></div>
                <div className="flex items-center">
                  {getStatusIcon(diagnosticData.permissions.isAdmin)}
                  <span className="ml-2">É Admin: {diagnosticData.permissions.isAdmin ? 'Sim' : 'Não'}</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(diagnosticData.permissions.isManager)}
                  <span className="ml-2">Pode gerenciar: {diagnosticData.permissions.isManager ? 'Sim' : 'Não'}</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(diagnosticData.permissions.isCollaborator)}
                  <span className="ml-2">Pode colaborar: {diagnosticData.permissions.isCollaborator ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dados Brutos */}
          <details className="p-4 bg-gray-50 border rounded-lg">
            <summary className="cursor-pointer font-medium">Ver dados brutos</summary>
            <pre className="mt-2 text-xs overflow-x-auto">
              {JSON.stringify(diagnosticData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AuthDiagnostic;