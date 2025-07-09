import jsPDF from 'jspdf';
import { UserStoryData } from '../types';

export const generateUserStoryPDF = (data: Omit<UserStoryData, 'createdAt'>, projectName?: string): void => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 30;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * (fontSize * 0.4));
    };

    // Helper function to add section header
    const addSectionHeader = (title: string, y: number): number => {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      doc.setFont('helvetica', 'normal');
      return y + 10;
    };

    // Helper function to add field
    const addField = (label: string, value: string, y: number): number => {
      if (!value || !value.trim()) return y;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      
      return addWrappedText(value, margin, y + 5, maxWidth, 10) + 8;
    };

    // Check if we need a new page
    const checkNewPage = (requiredSpace: number): number => {
      if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
        doc.addPage();
        return 30;
      }
      return yPosition;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('História de Usuário', pageWidth / 2, 20, { align: 'center' });
    
    // Seção 1: Identificação
    yPosition = checkNewPage(60);
    yPosition = addSectionHeader('1. Identificação da História', yPosition);
    yPosition = addField('ID da História', data.id, yPosition);
    yPosition = addField('Data', new Date(data.date).toLocaleDateString('pt-BR'), yPosition);
    yPosition = addField('Autor', data.author, yPosition);
    if (projectName) {
      yPosition = addField('Projeto', projectName, yPosition);
    }
    yPosition += 5;

    // Seção 2: Sobre o Usuário
    yPosition = checkNewPage(80);
    yPosition = addSectionHeader('2. Sobre o Usuário', yPosition);
    yPosition = addField('Persona do Usuário', data.userPersona, yPosition);
    yPosition = addField('Papel no Processo', data.userRole, yPosition);
    yPosition = addField('Restrições Específicas', data.userConstraints, yPosition);
    yPosition += 5;

    // Seção 3: Objetivo da Funcionalidade
    yPosition = checkNewPage(80);
    yPosition = addSectionHeader('3. Objetivo da Funcionalidade', yPosition);
    yPosition = addField('O que o usuário deseja fazer', data.userDesire, yPosition);
    yPosition = addField('Por que é importante', data.userImportance, yPosition);
    yPosition = addField('Problema atual', data.currentProblem, yPosition);
    yPosition += 5;

    // Seção 4: Fluxo Esperado
    yPosition = checkNewPage(60);
    yPosition = addSectionHeader('4. Fluxo Esperado', yPosition);
    yPosition = addField('Etapas Principais', data.mainSteps, yPosition);
    yPosition = addField('Fluxos Alternativos', data.alternativeFlows, yPosition);
    yPosition += 5;

    // Seção 5: Regras e Critérios
    yPosition = checkNewPage(80);
    yPosition = addSectionHeader('5. Regras e Critérios de Aceitação', yPosition);
    yPosition = addField('Regras de Negócio', data.businessRules, yPosition);
    yPosition = addField('Validações', data.validations, yPosition);
    yPosition = addField('Critérios de Aceitação', data.acceptanceCriteria, yPosition);
    yPosition += 5;

    // Seção 6: Aspectos Técnicos
    yPosition = checkNewPage(80);
    yPosition = addSectionHeader('6. Aspectos Técnicos', yPosition);
    yPosition = addField('Dependências', data.dependencies, yPosition);
    yPosition = addField('Riscos Técnicos', data.technicalRisks, yPosition);
    yPosition = addField('Requer Spike', data.requiresSpike, yPosition);
    yPosition += 5;

    // Seção 7: Observações
    yPosition = checkNewPage(40);
    yPosition = addSectionHeader('7. Observações Adicionais', yPosition);
    yPosition = addField('Comentários', data.additionalComments, yPosition);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    const fileName = `historia-usuario-${data.id || 'sem-id'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('PDF gerado com sucesso:', fileName);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar o PDF. Verifique se todos os campos obrigatórios estão preenchidos.');
  }
};