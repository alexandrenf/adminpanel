'use server';

import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { env } from '~/env.js';
import { generateEmailHtml, formatCurrency } from '../../lib/emailTemplateLoader';

// Email types for different scenarios
export type EmailType = 
  | 'registration_confirmation'
  | 'registration_approved' 
  | 'registration_rejected'
  | 'payment_reminder'
  | 'payment_confirmation'
  | 'assembly_reminder'
  | 'resubmission_request'
  | 'generic';

// Base email data interface
interface BaseEmailData {
  to: string;
  participantName: string;
  assemblyName?: string;
}

// Specific email data interfaces
interface RegistrationConfirmationData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  assemblyLocation: string;
  assemblyDates: string;
  modalityName: string;
  paymentRequired: boolean;
  paymentAmount?: number;
  registrationUrl?: string;
  isPaymentExempt?: boolean;
  paymentExemptReason?: string;
}

interface RegistrationApprovedData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  assemblyLocation: string;
  assemblyDates: string;
  modalityName: string;
  additionalInstructions?: string;
  qrCodeUrl?: string;
  paymentAmount?: number;
  isPaymentExempt?: boolean;
  paymentExemptReason?: string;
}

interface RegistrationRejectedData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  rejectionReason: string;
  canResubmit: boolean;
  resubmissionUrl?: string;
  contactEmail?: string;
}

interface PaymentReminderData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  paymentAmount: number;
  paymentDeadline: string;
  paymentUrl: string;
  pixKey?: string;
  bankDetails?: string;
}

interface PaymentConfirmationData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  paymentAmount: number;
  paymentDate: string;
  receiptNumber?: string;
}

interface ResubmissionRequestData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  reasonForResubmission: string;
  resubmissionUrl: string;
  resubmissionDeadline?: string;
}

interface GenericEmailData extends BaseEmailData {
  subject: string;
  message: string;
  htmlMessage?: string;
}

// Union type for all email data types
export type EmailData = 
  | { type: 'registration_confirmation'; data: RegistrationConfirmationData }
  | { type: 'registration_approved'; data: RegistrationApprovedData }
  | { type: 'registration_rejected'; data: RegistrationRejectedData }
  | { type: 'payment_reminder'; data: PaymentReminderData }
  | { type: 'payment_confirmation'; data: PaymentConfirmationData }
  | { type: 'resubmission_request'; data: ResubmissionRequestData }
  | { type: 'generic'; data: GenericEmailData };

// Email result interface
interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

// Email validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

// Sanitize email content to prevent injection
function sanitizeContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
    allowedAttributes: {
      '*': ['style', 'class', 'id'],
      'a': ['href', 'name', 'target'],
      'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedStyles: {
      '*': {
        // Match HEX and RGB
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\([\s\d]+\)$/i],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        // Add more style filters as needed
      },
      'img': {
        'width': [/^\d+(?:px|%)?$/],
        'height': [/^\d+(?:px|%)?$/]
      }
    }
  });
}

// HTML escape function for user-generated content
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

// URL encoding function for href attributes
function encodeHtmlUrl(url: string): string {
  // Safely encode URLs for href attributes while preserving functionality
  try {
    // Handle empty or invalid URLs
    if (!url || typeof url !== 'string') {
      return '';
    }
    
    // For mailto links, return as-is since they don't need URL encoding
    if (url.startsWith('mailto:')) {
      return url;
    }
    
    // For data URLs, return as-is to preserve functionality
    if (url.startsWith('data:')) {
      return url;
    }
    
    // For regular URLs, use encodeURI to handle special characters
    // This preserves the URL structure while making it safe for href attributes
    return encodeURI(url);
  } catch (error) {
    // If encoding fails, return the original URL
    console.warn('Failed to encode URL:', url, error);
    return url;
  }
}

// Generate email content based on type
function generateEmailContent(emailData: EmailData): { subject: string; text: string; html: string } {
  const baseUrl = env.NEXTAUTH_URL;
  
  switch (emailData.type) {
    case 'registration_confirmation': {
      const confirmData = emailData.data;
      return {
        subject: `✅ Confirmação de Inscrição - ${confirmData.assemblyName}`,
        text: `
Olá ${confirmData.participantName},

Sua inscrição para ${confirmData.assemblyName} foi recebida com sucesso!

Detalhes da Inscrição:
- ID da Inscrição: ${confirmData.registrationId}
- Assembleia: ${confirmData.assemblyName}
- Local: ${confirmData.assemblyLocation}
- Datas: ${confirmData.assemblyDates}
- Modalidade: ${confirmData.modalityName}

${confirmData.paymentRequired ? `
${confirmData.isPaymentExempt ? `
PAGAMENTO: Isento de Pagamento
${confirmData.paymentExemptReason ? `Motivo: ${confirmData.paymentExemptReason}` : ''}
` : `
PAGAMENTO: ${confirmData.paymentAmount !== undefined && confirmData.paymentAmount !== null ? formatCurrency(confirmData.paymentAmount) : 'N/A'}
Status: Pagamento Necessário
`}
` : 'Sua inscrição será analisada em breve.'}

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('registration-confirmation', confirmData)
      };
    }

    case 'registration_approved': {
      const approvedData = emailData.data;
      return {
        subject: `🎉 Inscrição Aprovada - ${approvedData.assemblyName}`,
        text: `
Olá ${approvedData.participantName},

Parabéns! Sua inscrição para ${approvedData.assemblyName} foi APROVADA!

Detalhes:
- ID da Inscrição: ${approvedData.registrationId}
- Assembleia: ${approvedData.assemblyName}
- Local: ${approvedData.assemblyLocation}
- Datas: ${approvedData.assemblyDates}
- Modalidade: ${approvedData.modalityName}

${((approvedData.paymentAmount !== undefined && approvedData.paymentAmount !== null && approvedData.paymentAmount > 0) || approvedData.isPaymentExempt) ? `
${approvedData.isPaymentExempt ? `
PAGAMENTO: Isento de Pagamento
${approvedData.paymentExemptReason ? `Motivo: ${approvedData.paymentExemptReason}` : ''}
` : `
PAGAMENTO: ${approvedData.paymentAmount !== undefined && approvedData.paymentAmount !== null ? formatCurrency(approvedData.paymentAmount) : 'N/A'}
Status: Pagamento Confirmado
`}
` : ''}

${approvedData.additionalInstructions ? `
Instruções Adicionais:
${approvedData.additionalInstructions}
` : ''}

${approvedData.qrCodeUrl ? `
Seu QR Code de participação estará disponível em: ${approvedData.qrCodeUrl}
` : ''}

Nos vemos na assembleia!

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('registration-approved', {
          ...approvedData,
          hasPayment: (approvedData.paymentAmount !== undefined && approvedData.paymentAmount !== null && approvedData.paymentAmount > 0) || approvedData.isPaymentExempt
        })
      };
    }

    case 'registration_rejected': {
      const rejectedData = emailData.data;
      return {
        subject: `❌ Inscrição Rejeitada - ${rejectedData.assemblyName}`,
        text: `
Olá ${rejectedData.participantName},

Infelizmente, sua inscrição para ${rejectedData.assemblyName} foi rejeitada.

Detalhes:
- ID da Inscrição: ${rejectedData.registrationId}
- Assembleia: ${rejectedData.assemblyName}
- Motivo: ${rejectedData.rejectionReason}

${rejectedData.canResubmit ? `
Você pode reenviar sua inscrição através do link: ${rejectedData.resubmissionUrl}
` : 'Não é possível reenviar a inscrição no momento.'}

${rejectedData.contactEmail ? `
Para esclarecimentos, entre em contato: ${rejectedData.contactEmail}
` : ''}

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('registration-rejected', rejectedData)
      };
    }

    case 'payment_reminder': {
      const reminderData = emailData.data;
      return {
        subject: `💳 Lembrete de Pagamento - ${reminderData.assemblyName}`,
        text: `
Olá ${reminderData.participantName},

Este é um lembrete sobre o pagamento pendente para ${reminderData.assemblyName}.

Detalhes:
- ID da Inscrição: ${reminderData.registrationId}
- Assembleia: ${reminderData.assemblyName}
- Valor: ${formatCurrency(reminderData.paymentAmount)}
- Prazo: ${reminderData.paymentDeadline}

Link para pagamento: ${reminderData.paymentUrl}

${reminderData.pixKey ? `PIX: ${reminderData.pixKey}` : ''}
${reminderData.bankDetails ? `Dados bancários: ${reminderData.bankDetails}` : ''}

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('payment-reminder', reminderData)
      };
    }

    case 'payment_confirmation': {
      const confirmationData = emailData.data;
      return {
        subject: `✅ Pagamento Confirmado - ${confirmationData.assemblyName}`,
        text: `
Olá ${confirmationData.participantName},

Seu pagamento para ${confirmationData.assemblyName} foi confirmado!

Detalhes:
- ID da Inscrição: ${confirmationData.registrationId}
- Assembleia: ${confirmationData.assemblyName}
- Valor Pago: ${formatCurrency(confirmationData.paymentAmount)}
- Data do Pagamento: ${confirmationData.paymentDate}
${confirmationData.receiptNumber ? `- Número do Recibo: ${confirmationData.receiptNumber}` : ''}

Obrigado por participar!

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('payment-confirmation', confirmationData)
      };
    }

    case 'resubmission_request': {
      const resubmissionData = emailData.data;
      return {
        subject: `🔄 Solicitação de Reenvio - ${resubmissionData.assemblyName}`,
        text: `
Olá ${resubmissionData.participantName},

Solicitamos que você reenvie sua inscrição para ${resubmissionData.assemblyName}.

Detalhes:
- ID da Inscrição: ${resubmissionData.registrationId}
- Assembleia: ${resubmissionData.assemblyName}
- Motivo: ${resubmissionData.reasonForResubmission}

Link para reenvio: ${resubmissionData.resubmissionUrl}

${resubmissionData.resubmissionDeadline ? `Prazo para reenvio: ${resubmissionData.resubmissionDeadline}` : ''}

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('resubmission-request', resubmissionData)
      };
    }

    case 'generic': {
      const genericData = emailData.data;
      // Sanitize htmlMessage to prevent XSS vulnerabilities
      const sanitizedGenericData = {
        ...genericData,
        htmlMessage: genericData.htmlMessage ? sanitizeContent(genericData.htmlMessage) : genericData.htmlMessage
      };
      return {
        subject: genericData.subject,
        text: `
Olá ${genericData.participantName},

${genericData.message}

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: generateEmailHtml('generic', sanitizedGenericData)
      };
    }

    default:
      // This should never happen with TypeScript, but just in case
      throw new Error(`Unknown email type: ${(emailData as any).type}`);
  }
}

// Create transporter with retry logic
function createTransporter() {
  try {
    return nodemailer.createTransport({
      host: 'live.smtp.mailtrap.io',
      port: 587,
      secure: false,
      auth: {
        user: 'api',
        pass: env.MAILTRAP_API_TOKEN
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
      debug: true, // Enable debug logging
      logger: true // Enable logger
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    throw new Error('Email service configuration error');
  }
}

// Main email sending function
export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  try {
    // Validation
    if (!emailData.data.to || !validateEmail(emailData.data.to)) {
      return {
        success: false,
        message: 'Invalid recipient email address',
        error: 'INVALID_EMAIL'
      };
    }

    if (!emailData.data.participantName?.trim()) {
      return {
        success: false,
        message: 'Participant name is required',
        error: 'MISSING_NAME'
      };
    }

    // Generate email content
    const { subject, text, html } = generateEmailContent(emailData);

    // Create transporter
    const transporter = createTransporter();

    // Log configuration (without sensitive data)
    console.log('Attempting to send email with configuration:', {
      host: 'live.smtp.mailtrap.io',
      port: 587,
      secure: false,
      authMethod: 'PLAIN',
      to: emailData.data.to,
      from: "no-reply@assembleia.ifmsabrazil.org"
    });

    // Verify transporter connection
    try {
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
    } catch (verifyError) {
      console.error('Email service verification failed:', {
        error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        code: verifyError instanceof Error ? (verifyError as any).code : undefined,
        response: verifyError instanceof Error ? (verifyError as any).response : undefined,
        command: verifyError instanceof Error ? (verifyError as any).command : undefined
      });
      return {
        success: false,
        message: 'Email service unavailable',
        error: 'SERVICE_UNAVAILABLE'
      };
    }

    // Send email
    const info = await transporter.sendMail({
      from: {
        name: 'IFMSA Brazil',
        address: 'no-reply@assembleia.ifmsabrazil.org',
      },
      to: emailData.data.to,
      subject: subject,
      text: text,
      html: html,
      replyTo: "atendimento@ifmsabrazil.org",
      headers: {
        'X-Mailer': 'IFMSA Brazil Admin Panel',
        'X-Priority': '3',
        'Importance': 'normal',
      },
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: emailData.data.to
    });

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    };

  } catch (error) {
    console.error('Failed to send email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error ? (error as any).code : undefined,
      response: error instanceof Error ? (error as any).response : undefined,
      command: error instanceof Error ? (error as any).command : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      emailData: {
        to: emailData.data.to,
        type: emailData.type
      }
    });
    
    return {
      success: false,
      message: 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Utility function for sending emails with form data (legacy support)
export async function sendEmailFromForm(formData: FormData): Promise<EmailResult> {
  const name = formData.get('name')?.toString();
  const email = formData.get('email')?.toString();
  const message = formData.get('message')?.toString();
  const subject = formData.get('subject')?.toString();

  if (!name || !email || !message) {
    return {
      success: false,
      message: 'Name, email, and message are required',
      error: 'MISSING_FIELDS'
    };
  }

  return sendEmail({
    type: 'generic',
    data: {
      to: email,
      participantName: name,
      subject: subject || `New message from ${name}`,
      message: message,
    }
  });
}

// Utility functions for specific email types
export async function sendRegistrationConfirmation(data: RegistrationConfirmationData): Promise<EmailResult> {
  return sendEmail({
    type: 'registration_confirmation',
    data: data
  });
}

export async function sendRegistrationApproval(data: RegistrationApprovedData): Promise<EmailResult> {
  return sendEmail({
    type: 'registration_approved',
    data: data
  });
}

export async function sendRegistrationRejection(data: RegistrationRejectedData): Promise<EmailResult> {
  return sendEmail({
    type: 'registration_rejected',
    data: data
  });
}

export async function sendPaymentReminder(data: PaymentReminderData): Promise<EmailResult> {
  return sendEmail({ type: 'payment_reminder', data });
}

export async function sendPaymentConfirmation(data: PaymentConfirmationData): Promise<EmailResult> {
  return sendEmail({ type: 'payment_confirmation', data });
}

export async function sendResubmissionRequest(data: ResubmissionRequestData): Promise<EmailResult> {
  return sendEmail({ type: 'resubmission_request', data });
}

// Bulk email sending with rate limiting and progress tracking
export async function sendBulkEmails(
  emails: EmailData[],
  onProgress?: (sent: number, total: number, errors: string[]) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  const delayBetweenEmails = 1000; // 1 second delay to respect rate limits
  
  for (let i = 0; i < emails.length; i++) {
    const currentEmail = emails[i];
    if (!currentEmail) {
      results.failed++;
      results.errors.push('Undefined email data');
      continue;
    }

    try {
      const result = await sendEmail(currentEmail);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`${currentEmail.data.to}: ${result.message}`);
      }
      
      if (onProgress) {
        onProgress(results.success + results.failed, emails.length, results.errors);
      }
      
      // Rate limiting delay
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
      }
      
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${currentEmail.data.to}: ${errorMessage}`);
      
      if (onProgress) {
        onProgress(results.success + results.failed, emails.length, results.errors);
      }
    }
  }

  return results;
} 