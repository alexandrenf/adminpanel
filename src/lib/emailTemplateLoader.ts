import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface TemplateData {
  [key: string]: any;
}

interface EmailTemplate {
  title: string;
  icon: string;
  headerTitle: string;
  headerSubtitle: string;
  headerGradient: string;
  headerTextColor: string;
  content: string;
}

interface TemplateConfig {
  title: string;
  icon: string;
  headerTitle: string;
  headerSubtitle: string;
  headerGradient: string;
  headerTextColor: string;
}

// Get the current module directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use environment variable if set, otherwise resolve relative to current module
const TEMPLATES_DIR = process.env.EMAIL_TEMPLATES_DIR || 
  join(__dirname, '..', 'templates', 'email');

// Simple template engine for replacing placeholders
function processTemplate(template: string, data: TemplateData): string {
  let processed = template;
  
  // Replace simple variables {{variable}}
  processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return '';
    }
    return escapeHtml(String(value));
  });
  
  // Replace unescaped variables {{{variable}}}
  processed = processed.replace(/\{\{\{([^}]+)\}\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
  
  // Process conditional blocks with else {{#if condition}}...{{else}}...{{/if}} FIRST
  processed = processed.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, ifContent, elseContent) => {
    const value = data[condition];
    const isTrue = value && value !== false && value !== 0 && value !== '';
    return isTrue ? ifContent : elseContent;
  });
  
  // Process conditional blocks {{#if condition}}...{{/if}} AFTER else blocks
  processed = processed.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    const value = data[condition];
    const isTrue = value && value !== false && value !== 0 && value !== '';
    return isTrue ? content : '';
  });
  
  return processed;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'\/]/g, (char) => map[char] || char);
}

function loadBaseTemplate(): string {
  const baseTemplatePath = join(TEMPLATES_DIR, 'base.html');
  return readFileSync(baseTemplatePath, 'utf-8');
}

function loadContentTemplate(templateName: string): string {
  const templatePath = join(TEMPLATES_DIR, `${templateName}.html`);
  return readFileSync(templatePath, 'utf-8');
}

export function loadEmailTemplate(templateName: string, data: TemplateData): EmailTemplate {
  const baseTemplate = loadBaseTemplate();
  const contentTemplate = loadContentTemplate(templateName);
  
  // Process the content template first
  const processedContent = processTemplate(contentTemplate, data);
  
  // Get template-specific configuration
  const templateConfig = getTemplateConfig(templateName, data);
  
  return {
    title: templateConfig.title,
    icon: templateConfig.icon,
    headerTitle: templateConfig.headerTitle,
    headerSubtitle: templateConfig.headerSubtitle,
    headerGradient: templateConfig.headerGradient,
    headerTextColor: templateConfig.headerTextColor,
    content: processedContent
  };
}

export function generateEmailHtml(templateName: string, data: TemplateData): string {
  const template = loadEmailTemplate(templateName, data);
  const baseTemplate = loadBaseTemplate();
  
  return processTemplate(baseTemplate, template);
}

function getTemplateConfig(templateName: string, data: TemplateData): TemplateConfig {
  const getSubtitle = (assemblyName?: string): string => {
    return assemblyName || 'Informações Importantes';
  };

  const configs: { [key: string]: TemplateConfig } = {
    'registration-confirmation': {
      title: 'Confirmação de Inscrição',
      icon: '✅',
      headerTitle: 'Inscrição Confirmada',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      headerTextColor: '#e2e8f0'
    },
    'registration-approved': {
      title: 'Inscrição Aprovada',
      icon: '🎉',
      headerTitle: 'Inscrição Aprovada',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      headerTextColor: '#dcfce7'
    },
    'registration-rejected': {
      title: 'Inscrição Rejeitada',
      icon: '❌',
      headerTitle: 'Inscrição Rejeitada',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      headerTextColor: '#fecaca'
    },
    'payment-reminder': {
      title: 'Lembrete de Pagamento',
      icon: '⏰',
      headerTitle: 'Lembrete de Pagamento',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      headerTextColor: '#fef3c7'
    },
    'payment-confirmation': {
      title: 'Pagamento Confirmado',
      icon: '✅',
      headerTitle: 'Pagamento Confirmado',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      headerTextColor: '#dcfce7'
    },
    'resubmission-request': {
      title: 'Reenvio Solicitado',
      icon: '🔄',
      headerTitle: 'Reenvio Solicitado',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      headerTextColor: '#fef3c7'
    },
    'generic': {
      title: 'IFMSA Brazil',
      icon: '📧',
      headerTitle: 'IFMSA Brazil',
      headerSubtitle: getSubtitle(data.assemblyName),
      headerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      headerTextColor: '#e2e8f0'
    }
  };
  
  // Check if the specific template config exists
  if (configs[templateName]) {
    return configs[templateName];
  }
  
  // Check if the generic fallback exists
  if (configs['generic']) {
    return configs['generic'];
  }
  
  // If neither exists, throw a controlled error
  throw new Error(`Email template configuration not found for '${templateName}' and no generic fallback available`);
}

export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
} 