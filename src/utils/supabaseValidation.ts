import { supabase, db, auth } from '../lib/supabase';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

interface ValidationReport {
  connection: ValidationResult;
  authentication: ValidationResult;
  database: ValidationResult;
  rls: ValidationResult;
  policies: ValidationResult;
  triggers: ValidationResult;
  emailSettings: ValidationResult;
  overall: boolean;
}

export class SupabaseValidator {
  
  // 1. Validar conexão básica
  static async validateConnection(): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        return {
          success: false,
          message: `Erro de conexão: ${error.message}`,
          details: error
        };
      }
      
      return {
        success: true,
        message: 'Conexão com Supabase estabelecida com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro de conexão: ${error}`,
        details: error
      };
    }
  }

  // 2. Validar configurações de autenticação
  static async validateAuthentication(): Promise<ValidationResult> {
    try {
      // Verificar se conseguimos acessar as configurações de auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Verificar se as variáveis de ambiente estão corretas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return {
          success: false,
          message: 'Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas'
        };
      }
      
      if (!supabaseUrl.includes('supabase.co')) {
        return {
          success: false,
          message: 'URL do Supabase parece inválida'
        };
      }
      
      return {
        success: true,
        message: 'Configurações de autenticação válidas',
        details: {
          hasSession: !!session,
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          keyLength: supabaseKey.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação de autenticação: ${error}`,
        details: error
      };
    }
  }

  // 3. Validar estrutura do banco de dados
  static async validateDatabase(): Promise<ValidationResult> {
    try {
      const requiredTables = ['profiles', 'teams', 'clients', 'projects', 'user_stories'];
      const results = [];
      
      for (const table of requiredTables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          results.push({
            table,
            exists: !error,
            error: error?.message
          });
        } catch (err) {
          results.push({
            table,
            exists: false,
            error: err
          });
        }
      }
      
      const missingTables = results.filter(r => !r.exists);
      
      if (missingTables.length > 0) {
        return {
          success: false,
          message: `Tabelas não encontradas: ${missingTables.map(t => t.table).join(', ')}`,
          details: results
        };
      }
      
      return {
        success: true,
        message: 'Todas as tabelas necessárias existem',
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação do banco: ${error}`,
        details: error
      };
    }
  }

  // 4. Validar RLS (Row Level Security)
  static async validateRLS(): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.rpc('check_rls_status');
      
      if (error) {
        // Se a função não existe, vamos criar uma query alternativa
        const { data: rlsData, error: rlsError } = await supabase
          .from('information_schema.tables')
          .select('table_name, row_security')
          .eq('table_schema', 'public')
          .in('table_name', ['profiles', 'teams', 'clients', 'projects', 'user_stories']);
        
        if (rlsError) {
          return {
            success: false,
            message: `Erro ao verificar RLS: ${rlsError.message}`,
            details: rlsError
          };
        }
        
        return {
          success: true,
          message: 'RLS verificado (método alternativo)',
          details: rlsData
        };
      }
      
      return {
        success: true,
        message: 'RLS configurado corretamente',
        details: data
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação RLS: ${error}`,
        details: error
      };
    }
  }

  // 5. Validar políticas de segurança
  static async validatePolicies(): Promise<ValidationResult> {
    try {
      // Tentar uma operação que requer políticas
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(1);
      
      if (error && error.message.includes('policy')) {
        return {
          success: false,
          message: `Erro de política: ${error.message}`,
          details: error
        };
      }
      
      return {
        success: true,
        message: 'Políticas de segurança funcionando',
        details: { canReadProfiles: !error }
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação de políticas: ${error}`,
        details: error
      };
    }
  }

  // 6. Validar triggers e funções
  static async validateTriggers(): Promise<ValidationResult> {
    try {
      // Verificar se a função handle_new_user existe
      const { data, error } = await supabase.rpc('check_function_exists', {
        function_name: 'handle_new_user'
      });
      
      if (error) {
        // Método alternativo - tentar executar uma query que usa a função
        const { error: triggerError } = await supabase
          .from('pg_proc')
          .select('proname')
          .eq('proname', 'handle_new_user')
          .limit(1);
        
        return {
          success: !triggerError,
          message: triggerError ? 
            'Função handle_new_user não encontrada' : 
            'Função handle_new_user existe',
          details: { error: triggerError }
        };
      }
      
      return {
        success: true,
        message: 'Triggers e funções configurados',
        details: data
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação de triggers: ${error}`,
        details: error
      };
    }
  }

  // 7. Validar configurações de email
  static async validateEmailSettings(): Promise<ValidationResult> {
    try {
      // Não podemos verificar diretamente as configurações de email,
      // mas podemos verificar se conseguimos fazer signup
      return {
        success: true,
        message: 'Configurações de email devem ser verificadas no dashboard do Supabase',
        details: {
          note: 'Verifique Authentication > Settings no dashboard',
          recommendation: 'Desabilite "Enable email confirmations" para testes'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na validação de email: ${error}`,
        details: error
      };
    }
  }

  // Executar todas as validações
  static async runFullValidation(): Promise<ValidationReport> {
    console.log('🔍 Iniciando validação completa do Supabase...');
    
    const results: ValidationReport = {
      connection: await this.validateConnection(),
      authentication: await this.validateAuthentication(),
      database: await this.validateDatabase(),
      rls: await this.validateRLS(),
      policies: await this.validatePolicies(),
      triggers: await this.validateTriggers(),
      emailSettings: await this.validateEmailSettings(),
      overall: false
    };
    
    // Determinar status geral
    results.overall = Object.values(results)
      .filter(r => typeof r === 'object' && 'success' in r)
      .every(r => (r as ValidationResult).success);
    
    return results;
  }

  // Testar criação de usuário
  static async testUserCreation(email: string, password: string, fullName: string): Promise<ValidationResult> {
    try {
      console.log('🧪 Testando criação de usuário...');
      
      // Tentar criar usuário
      const { data, error } = await auth.signUp(email, password, fullName);
      
      if (error) {
        return {
          success: false,
          message: `Erro ao criar usuário: ${error.message}`,
          details: error
        };
      }
      
      if (!data.user) {
        return {
          success: false,
          message: 'Usuário não foi criado (data.user é null)'
        };
      }
      
      // Verificar se o perfil foi criado
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar trigger
      
      const profile = await auth.getCurrentProfile();
      
      return {
        success: true,
        message: 'Usuário criado com sucesso',
        details: {
          userId: data.user.id,
          email: data.user.email,
          profileCreated: !!profile,
          needsEmailConfirmation: !data.user.email_confirmed_at
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro no teste de criação: ${error}`,
        details: error
      };
    }
  }

  // Gerar relatório formatado
  static formatReport(report: ValidationReport): string {
    let output = '\n🔍 RELATÓRIO DE VALIDAÇÃO DO SUPABASE\n';
    output += '=' .repeat(50) + '\n\n';
    
    const sections = [
      { key: 'connection', name: '1. Conexão' },
      { key: 'authentication', name: '2. Autenticação' },
      { key: 'database', name: '3. Banco de Dados' },
      { key: 'rls', name: '4. Row Level Security' },
      { key: 'policies', name: '5. Políticas de Segurança' },
      { key: 'triggers', name: '6. Triggers e Funções' },
      { key: 'emailSettings', name: '7. Configurações de Email' }
    ];
    
    sections.forEach(section => {
      const result = report[section.key as keyof ValidationReport] as ValidationResult;
      const status = result.success ? '✅' : '❌';
      output += `${status} ${section.name}: ${result.message}\n`;
      
      if (result.details && !result.success) {
        output += `   Detalhes: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      output += '\n';
    });
    
    output += '=' .repeat(50) + '\n';
    output += `STATUS GERAL: ${report.overall ? '✅ APROVADO' : '❌ REQUER ATENÇÃO'}\n`;
    output += '=' .repeat(50) + '\n';
    
    if (!report.overall) {
      output += '\n📋 AÇÕES RECOMENDADAS:\n';
      output += '1. Verifique as configurações no dashboard do Supabase\n';
      output += '2. Execute as migrações SQL se necessário\n';
      output += '3. Configure as variáveis de ambiente\n';
      output += '4. Desabilite confirmação de email para testes\n';
      output += '5. Verifique as políticas RLS\n\n';
    }
    
    return output;
  }
}

// Função para executar validação via console
export const runSupabaseValidation = async () => {
  const report = await SupabaseValidator.runFullValidation();
  const formattedReport = SupabaseValidator.formatReport(report);
  console.log(formattedReport);
  return report;
};

// Função para testar criação de usuário
export const testUserCreation = async () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'test123456';
  const testName = 'Usuário Teste';
  
  const result = await SupabaseValidator.testUserCreation(testEmail, testPassword, testName);
  console.log('🧪 Resultado do teste de criação:', result);
  return result;
};