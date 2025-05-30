'use server';

import nodemailer from 'nodemailer';
import { env } from '~/env.js';

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
  paymentAmount?: string;
  registrationUrl?: string;
}

interface RegistrationApprovedData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  assemblyLocation: string;
  assemblyDates: string;
  modalityName: string;
  additionalInstructions?: string;
  qrCodeUrl?: string;
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
  paymentAmount: string;
  paymentDeadline: string;
  paymentUrl: string;
  pixKey?: string;
  bankDetails?: string;
}

interface PaymentConfirmationData extends BaseEmailData {
  registrationId: string;
  assemblyName: string;
  paymentAmount: string;
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
  return content
    .replace(/[<>]/g, '') // Remove potential HTML injection
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .trim();
}

// Generate email content based on type
function generateEmailContent(emailData: EmailData): { subject: string; text: string; html: string } {
  const baseUrl = env.NEXTAUTH_URL;
  
  switch (emailData.type) {
    case 'registration_confirmation':
      const confirmData = emailData.data;
      return {
        subject: `Confirmação de Inscrição - ${confirmData.assemblyName}`,
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
IMPORTANTE: Sua inscrição requer pagamento de ${confirmData.paymentAmount}.
Por favor, efetue o pagamento e envie o comprovante para que sua inscrição seja processada.
${confirmData.registrationUrl ? `\nPara enviar o comprovante, acesse: ${confirmData.registrationUrl}` : ''}
` : 'Sua inscrição será analisada em breve.'}

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Confirmação de Inscrição</h1>
      <h2>${confirmData.assemblyName}</h2>
    </div>
    <div class="content">
      <p>Olá <strong>${confirmData.participantName}</strong>,</p>
      <p>Sua inscrição foi recebida com sucesso!</p>
      
      <div class="details">
        <h3>Detalhes da Inscrição</h3>
        <p><strong>ID da Inscrição:</strong> ${confirmData.registrationId}</p>
        <p><strong>Assembleia:</strong> ${confirmData.assemblyName}</p>
        <p><strong>Local:</strong> ${confirmData.assemblyLocation}</p>
        <p><strong>Datas:</strong> ${confirmData.assemblyDates}</p>
        <p><strong>Modalidade:</strong> ${confirmData.modalityName}</p>
      </div>
      
      ${confirmData.paymentRequired ? `
      <div class="warning">
        <h3>⚠️ Pagamento Necessário</h3>
        <p>Sua inscrição requer pagamento de <strong>${confirmData.paymentAmount}</strong>.</p>
        <p>Por favor, efetue o pagamento e envie o comprovante para que sua inscrição seja processada.</p>
        ${confirmData.registrationUrl ? `<a href="${confirmData.registrationUrl}" class="button">Enviar Comprovante</a>` : ''}
      </div>
      ` : '<p>Sua inscrição será analisada em breve.</p>'}
    </div>
    <div class="footer">
      <p>Em caso de dúvidas, entre em contato conosco.</p>
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'registration_approved':
      const approvedData = emailData.data;
      return {
        subject: `✅ Inscrição Aprovada - ${approvedData.assemblyName}`,
        text: `
Olá ${approvedData.participantName},

Parabéns! Sua inscrição para ${approvedData.assemblyName} foi APROVADA!

Detalhes:
- ID da Inscrição: ${approvedData.registrationId}
- Assembleia: ${approvedData.assemblyName}
- Local: ${approvedData.assemblyLocation}
- Datas: ${approvedData.assemblyDates}
- Modalidade: ${approvedData.modalityName}

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
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Inscrição Aprovada!</h1>
      <h2>${approvedData.assemblyName}</h2>
    </div>
    <div class="content">
      <div class="success">
        <p>Olá <strong>${approvedData.participantName}</strong>,</p>
        <p><strong>Parabéns! Sua inscrição foi APROVADA!</strong></p>
      </div>
      
      <div class="details">
        <h3>Detalhes da Inscrição</h3>
        <p><strong>ID da Inscrição:</strong> ${approvedData.registrationId}</p>
        <p><strong>Assembleia:</strong> ${approvedData.assemblyName}</p>
        <p><strong>Local:</strong> ${approvedData.assemblyLocation}</p>
        <p><strong>Datas:</strong> ${approvedData.assemblyDates}</p>
        <p><strong>Modalidade:</strong> ${approvedData.modalityName}</p>
      </div>
      
      ${approvedData.additionalInstructions ? `
      <div class="details">
        <h3>Instruções Adicionais</h3>
        <p>${approvedData.additionalInstructions}</p>
      </div>
      ` : ''}
      
      ${approvedData.qrCodeUrl ? `
      <div class="details">
        <h3>QR Code de Participação</h3>
        <p>Seu QR Code estará disponível em:</p>
        <a href="${approvedData.qrCodeUrl}" class="button">Acessar QR Code</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Nos vemos na assembleia!</p>
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'registration_rejected':
      const rejectedData = emailData.data;
      return {
        subject: `❌ Inscrição Rejeitada - ${rejectedData.assemblyName}`,
        text: `
Olá ${rejectedData.participantName},

Infelizmente, sua inscrição para ${rejectedData.assemblyName} foi rejeitada.

ID da Inscrição: ${rejectedData.registrationId}
Assembleia: ${rejectedData.assemblyName}

Motivo da Rejeição:
${rejectedData.rejectionReason}

${rejectedData.canResubmit ? `
Você pode reenviar sua inscrição corrigindo os problemas mencionados.
${rejectedData.resubmissionUrl ? `Para reenviar, acesse: ${rejectedData.resubmissionUrl}` : ''}
` : 'Infelizmente, não é possível reenviar a inscrição para esta assembleia.'}

${rejectedData.contactEmail ? `
Para esclarecimentos, entre em contato: ${rejectedData.contactEmail}
` : ''}

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .rejection { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .resubmit { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Inscrição Rejeitada</h1>
      <h2>${rejectedData.assemblyName}</h2>
    </div>
    <div class="content">
      <p>Olá <strong>${rejectedData.participantName}</strong>,</p>
      
      <div class="rejection">
        <p>Infelizmente, sua inscrição foi rejeitada.</p>
        <p><strong>ID da Inscrição:</strong> ${rejectedData.registrationId}</p>
      </div>
      
      <div class="details">
        <h3>Motivo da Rejeição</h3>
        <p>${rejectedData.rejectionReason}</p>
      </div>
      
      ${rejectedData.canResubmit ? `
      <div class="resubmit">
        <h3>💡 Possibilidade de Reenvio</h3>
        <p>Você pode reenviar sua inscrição corrigindo os problemas mencionados.</p>
        ${rejectedData.resubmissionUrl ? `<a href="${rejectedData.resubmissionUrl}" class="button">Reenviar Inscrição</a>` : ''}
      </div>
      ` : `
      <div class="rejection">
        <p><strong>Infelizmente, não é possível reenviar a inscrição para esta assembleia.</strong></p>
      </div>
      `}
      
      ${rejectedData.contactEmail ? `
      <div class="details">
        <h3>Contato</h3>
        <p>Para esclarecimentos, entre em contato: <a href="mailto:${rejectedData.contactEmail}">${rejectedData.contactEmail}</a></p>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'payment_reminder':
      const paymentData = emailData.data;
      return {
        subject: `💰 Lembrete de Pagamento - ${paymentData.assemblyName}`,
        text: `
Olá ${paymentData.participantName},

Este é um lembrete sobre o pagamento pendente para sua inscrição.

Detalhes do Pagamento:
- ID da Inscrição: ${paymentData.registrationId}
- Assembleia: ${paymentData.assemblyName}
- Valor: ${paymentData.paymentAmount}
- Prazo: ${paymentData.paymentDeadline}

Para efetuar o pagamento: ${paymentData.paymentUrl}

${paymentData.pixKey ? `PIX: ${paymentData.pixKey}` : ''}
${paymentData.bankDetails ? `Dados Bancários: ${paymentData.bankDetails}` : ''}

IMPORTANTE: Envie o comprovante de pagamento para confirmar sua inscrição.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Lembrete de Pagamento</h1>
      <h2>${paymentData.assemblyName}</h2>
    </div>
    <div class="content">
      <p>Olá <strong>${paymentData.participantName}</strong>,</p>
      <p>Este é um lembrete sobre o pagamento pendente para sua inscrição.</p>
      
      <div class="details">
        <h3>Detalhes do Pagamento</h3>
        <p><strong>ID da Inscrição:</strong> ${paymentData.registrationId}</p>
        <p><strong>Assembleia:</strong> ${paymentData.assemblyName}</p>
        <p><strong>Valor:</strong> ${paymentData.paymentAmount}</p>
        <p><strong>Prazo:</strong> ${paymentData.paymentDeadline}</p>
      </div>
      
      <div class="details">
        <h3>Como Pagar</h3>
        <a href="${paymentData.paymentUrl}" class="button">Acessar Página de Pagamento</a>
        ${paymentData.pixKey ? `<p><strong>PIX:</strong> ${paymentData.pixKey}</p>` : ''}
        ${paymentData.bankDetails ? `<p><strong>Dados Bancários:</strong> ${paymentData.bankDetails}</p>` : ''}
      </div>
      
      <div class="warning">
        <p><strong>IMPORTANTE:</strong> Após o pagamento, envie o comprovante para confirmar sua inscrição.</p>
      </div>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'payment_confirmation':
      const paymentConfirmData = emailData.data;
      return {
        subject: `✅ Pagamento Confirmado - ${paymentConfirmData.assemblyName}`,
        text: `
Olá ${paymentConfirmData.participantName},

Seu pagamento foi confirmado com sucesso!

Detalhes:
- ID da Inscrição: ${paymentConfirmData.registrationId}
- Assembleia: ${paymentConfirmData.assemblyName}
- Valor Pago: ${paymentConfirmData.paymentAmount}
- Data do Pagamento: ${paymentConfirmData.paymentDate}
${paymentConfirmData.receiptNumber ? `- Número do Recibo: ${paymentConfirmData.receiptNumber}` : ''}

Sua inscrição está sendo processada e você receberá uma confirmação em breve.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pagamento Confirmado</h1>
      <h2>${paymentConfirmData.assemblyName}</h2>
    </div>
    <div class="content">
      <div class="success">
        <p>Olá <strong>${paymentConfirmData.participantName}</strong>,</p>
        <p><strong>Seu pagamento foi confirmado com sucesso!</strong></p>
      </div>
      
      <div class="details">
        <h3>Detalhes do Pagamento</h3>
        <p><strong>ID da Inscrição:</strong> ${paymentConfirmData.registrationId}</p>
        <p><strong>Assembleia:</strong> ${paymentConfirmData.assemblyName}</p>
        <p><strong>Valor Pago:</strong> ${paymentConfirmData.paymentAmount}</p>
        <p><strong>Data do Pagamento:</strong> ${paymentConfirmData.paymentDate}</p>
        ${paymentConfirmData.receiptNumber ? `<p><strong>Número do Recibo:</strong> ${paymentConfirmData.receiptNumber}</p>` : ''}
      </div>
      
      <div class="details">
        <p>Sua inscrição está sendo processada e você receberá uma confirmação em breve.</p>
      </div>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'resubmission_request':
      const resubmitData = emailData.data;
      return {
        subject: `🔄 Solicitação de Reenvio - ${resubmitData.assemblyName}`,
        text: `
Olá ${resubmitData.participantName},

Solicitamos que você reenvie sua inscrição para ${resubmitData.assemblyName}.

ID da Inscrição: ${resubmitData.registrationId}

Motivo para Reenvio:
${resubmitData.reasonForResubmission}

Para reenviar sua inscrição: ${resubmitData.resubmissionUrl}

${resubmitData.resubmissionDeadline ? `Prazo para reenvio: ${resubmitData.resubmissionDeadline}` : ''}

Por favor, corrija as informações mencionadas e reenvie sua inscrição.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 Solicitação de Reenvio</h1>
      <h2>${resubmitData.assemblyName}</h2>
    </div>
    <div class="content">
      <p>Olá <strong>${resubmitData.participantName}</strong>,</p>
      <p>Solicitamos que você reenvie sua inscrição.</p>
      
      <div class="details">
        <p><strong>ID da Inscrição:</strong> ${resubmitData.registrationId}</p>
      </div>
      
      <div class="info">
        <h3>Motivo para Reenvio</h3>
        <p>${resubmitData.reasonForResubmission}</p>
      </div>
      
      <div class="details">
        <h3>Como Proceder</h3>
        <p>Por favor, corrija as informações mencionadas e reenvie sua inscrição.</p>
        <a href="${resubmitData.resubmissionUrl}" class="button">Reenviar Inscrição</a>
        ${resubmitData.resubmissionDeadline ? `<p><strong>Prazo:</strong> ${resubmitData.resubmissionDeadline}</p>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'generic':
      const genericData = emailData.data;
      return {
        subject: sanitizeContent(genericData.subject),
        text: sanitizeContent(genericData.message),
        html: genericData.htmlMessage ? sanitizeContent(genericData.htmlMessage) : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IFMSA Brazil</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${genericData.participantName}</strong>,</p>
      <div style="white-space: pre-line;">${sanitizeContent(genericData.message)}</div>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
    </div>
  </div>
</body>
</html>
        `
      };

    default:
      throw new Error('Invalid email type');
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
  const { to, participantName, registrationId, assemblyName, assemblyLocation, assemblyDates, modalityName, paymentRequired, paymentAmount, registrationUrl } = data;

  const subject = `Confirmação de Inscrição - ${assemblyName}`;
  const message = `
    <h2>Olá ${participantName},</h2>
    <p>Recebemos sua inscrição para a <strong>${assemblyName}</strong>.</p>
    
    <h3>Detalhes da Inscrição:</h3>
    <ul>
      <li><strong>ID da Inscrição:</strong> ${registrationId}</li>
      <li><strong>Evento:</strong> ${assemblyName}</li>
      <li><strong>Local:</strong> ${assemblyLocation}</li>
      <li><strong>Datas:</strong> ${assemblyDates}</li>
      <li><strong>Modalidade:</strong> ${modalityName}</li>
    </ul>

    ${paymentRequired ? `
    <h3>Informações de Pagamento:</h3>
    <p>Valor a pagar: <strong>${paymentAmount}</strong></p>
    <p>Para realizar o pagamento, acesse: <a href="${registrationUrl}">${registrationUrl}</a></p>
    ` : ''}

    <p>Esta inscrição está pendente de aprovação. Você receberá um email quando sua inscrição for aprovada.</p>
    
    <p>Em caso de dúvidas, entre em contato com nossa equipe de suporte.</p>
    
    <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
  `;

  return sendEmail({
    type: 'generic',
    data: {
      to,
      participantName,
      subject,
      message,
    }
  });
}

export async function sendRegistrationApproval(data: RegistrationApprovedData): Promise<EmailResult> {
  const { to, participantName, registrationId, assemblyName, assemblyLocation, assemblyDates, modalityName, additionalInstructions, qrCodeUrl } = data;

  const subject = `Inscrição Aprovada - ${assemblyName}`;
  const message = `
    <h2>Parabéns ${participantName}!</h2>
    <p>Sua inscrição para a <strong>${assemblyName}</strong> foi aprovada!</p>
    
    <h3>Detalhes da Inscrição:</h3>
    <ul>
      <li><strong>ID da Inscrição:</strong> ${registrationId}</li>
      <li><strong>Evento:</strong> ${assemblyName}</li>
      <li><strong>Local:</strong> ${assemblyLocation}</li>
      <li><strong>Datas:</strong> ${assemblyDates}</li>
      <li><strong>Modalidade:</strong> ${modalityName}</li>
    </ul>

    ${qrCodeUrl ? `
    <h3>QR Code de Acesso:</h3>
    <p>Apresente este QR Code no check-in do evento:</p>
    <img src="${qrCodeUrl}" alt="QR Code de Acesso" style="max-width: 200px; margin: 20px 0;" />
    ` : ''}

    ${additionalInstructions ? `
    <h3>Instruções Adicionais:</h3>
    <p>${additionalInstructions}</p>
    ` : ''}

    <p>Estamos ansiosos para recebê-lo(a) no evento!</p>
    
    <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
  `;

  return sendEmail({
    type: 'generic',
    data: {
      to,
      participantName,
      subject,
      message,
    }
  });
}

export async function sendRegistrationRejection(data: RegistrationRejectedData): Promise<EmailResult> {
  const { to, participantName, registrationId, assemblyName, rejectionReason, canResubmit, resubmissionUrl, contactEmail } = data;

  const subject = `Inscrição Não Aprovada - ${assemblyName}`;
  const message = `
    <h2>Olá ${participantName},</h2>
    <p>Infelizmente sua inscrição para a <strong>${assemblyName}</strong> não foi aprovada.</p>
    
    <h3>Detalhes da Inscrição:</h3>
    <ul>
      <li><strong>ID da Inscrição:</strong> ${registrationId}</li>
      <li><strong>Evento:</strong> ${assemblyName}</li>
    </ul>

    <h3>Motivo da Não Aprovação:</h3>
    <p>${rejectionReason}</p>

    ${canResubmit ? `
    <h3>Reenvio da Inscrição:</h3>
    <p>Você pode reenviar sua inscrição com as correções necessárias através do link:</p>
    <p><a href="${resubmissionUrl}">${resubmissionUrl}</a></p>
    ` : ''}

    ${contactEmail ? `
    <h3>Dúvidas?</h3>
    <p>Se você tiver alguma dúvida, entre em contato com nossa equipe de suporte:</p>
    <p><a href="mailto:${contactEmail}">${contactEmail}</a></p>
    ` : ''}

    <p>Atenciosamente,<br>Equipe IFMSA Brazil</p>
  `;

  return sendEmail({
    type: 'generic',
    data: {
      to,
      participantName,
      subject,
      message,
    }
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