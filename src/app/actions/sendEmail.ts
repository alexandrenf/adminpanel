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
  return content
    .replace(/[<>]/g, '') // Remove potential HTML injection
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .trim();
}

// Format currency to BRL
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

// Generate email content based on type
function generateEmailContent(emailData: EmailData): { subject: string; text: string; html: string } {
  const baseUrl = env.NEXTAUTH_URL;
  
  switch (emailData.type) {
    case 'registration_confirmation':
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
PAGAMENTO: ${formatCurrency(confirmData.paymentAmount)}
Status: Pagamento Necessário
`}
` : 'Sua inscrição será analisada em breve.'}

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe IFMSA Brazil
        `,
        html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmação de Inscrição - IFMSA Brazil</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      line-height: 1.6;
      width: 100% !important;
      min-width: 100%;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 400;
      color: #e2e8f0;
      opacity: 0.9;
    }
    .header .icon {
      width: 60px;
      height: 60px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    
    /* Content */
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .content h3 {
      margin: 30px 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
    }
    
    /* Status badge */
    .status-badge {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 10px 0;
    }
    
    /* Details card */
    .details-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      position: relative;
    }
    .details-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #1e3a8a);
      border-radius: 12px 12px 0 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 12px;
      align-items: center;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
      margin-right: 15px;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }
    
    /* Warning/Payment section */
    .payment-section {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      position: relative;
    }
    .payment-section::before {
      content: '⚠️';
      position: absolute;
      top: -12px;
      left: 20px;
      background: #f59e0b;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .payment-section h3 {
      margin-top: 0;
      color: #92400e;
    }
    .payment-amount {
      font-size: 24px;
      font-weight: 700;
      color: #92400e;
      margin: 10px 0;
    }
    
    /* Button */
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      margin: 15px 0;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
    
    /* Success message */
    .success-message {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .success-message p {
      margin: 0;
      color: #065f46;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #64748b;
    }
    .footer .logo {
      font-weight: 700;
      color: #1e3a8a;
      font-size: 16px;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0 10px;
        border-radius: 8px;
      }
      .header, .content {
        padding: 25px 20px;
      }
      .details-card, .payment-section {
        padding: 20px;
      }
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .detail-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px 0;">
        <div class="email-container">
          <!-- Header -->
    <div class="header">
            <div class="icon">✅</div>
            <h1>Inscrição Confirmada</h1>
      <h2>${confirmData.assemblyName}</h2>
    </div>
          
          <!-- Content -->
    <div class="content">
      <p>Olá <strong>${confirmData.participantName}</strong>,</p>
            <p>Ficamos felizes em confirmar que sua inscrição foi recebida com sucesso!</p>
            
            <div class="status-badge">Inscrição Registrada</div>
            
            <div class="details-card">
              <h3>📋 Detalhes da Inscrição</h3>
              <div class="detail-row">
                <span class="detail-label">ID da Inscrição:</span>
                <span class="detail-value">${confirmData.registrationId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Evento:</span>
                <span class="detail-value">${confirmData.assemblyName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Local:</span>
                <span class="detail-value">${confirmData.assemblyLocation}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Datas:</span>
                <span class="detail-value">${confirmData.assemblyDates}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Modalidade:</span>
                <span class="detail-value">${confirmData.modalityName}</span>
              </div>
      </div>
      
      ${confirmData.paymentRequired ? `
            <div class="payment-section">
              <h3>💳 Informações de Pagamento</h3>
              ${confirmData.isPaymentExempt ? `
                <div class="payment-exempt">
                  <p><strong>Status:</strong> Isento de Pagamento</p>
                  ${confirmData.paymentExemptReason ? `<p><strong>Motivo:</strong> ${confirmData.paymentExemptReason}</p>` : ''}
      </div>
              ` : `
                <div class="payment-required">
                  <p><strong>Valor:</strong> ${formatCurrency(confirmData.paymentAmount)}</p>
                  <p><strong>Status:</strong> Comprovante de Pagamento enviado</p>
    </div>
              `}
            </div>
            ` : 'Sua inscrição será analisada em breve.'}
            
            <h3>📞 Precisa de Ajuda?</h3>
            <p>Se você tiver alguma dúvida ou precisar de assistência, nossa equipe está pronta para ajudar. Entre em contato conosco através dos nossos canais de atendimento.</p>
          </div>
          
          <!-- Footer -->
    <div class="footer">
            <p class="logo">IFMSA Brazil</p>
            <p>Estudantes de Medicina que fazem a diferença</p>
            <p>Este email foi enviado automaticamente, por favor não responda.</p>
    </div>
  </div>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      };

    case 'registration_approved':
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

${approvedData.paymentAmount || approvedData.isPaymentExempt ? `
${approvedData.isPaymentExempt ? `
PAGAMENTO: Isento de Pagamento
${approvedData.paymentExemptReason ? `Motivo: ${approvedData.paymentExemptReason}` : ''}
` : `
PAGAMENTO: ${formatCurrency(approvedData.paymentAmount)}
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
        html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inscrição Aprovada - IFMSA Brazil</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      line-height: 1.6;
      width: 100% !important;
      min-width: 100%;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 400;
      color: #dcfce7;
      opacity: 0.9;
    }
    .header .icon {
      width: 60px;
      height: 60px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    
    /* Content */
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .content h3 {
      margin: 30px 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
    }
    
    /* Success section */
    .success-hero {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 30px;
      margin: 25px 0;
      text-align: center;
      position: relative;
    }
    .success-hero::before {
      content: '🎉';
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .success-hero h3 {
      margin: 0 0 10px 0;
      color: #065f46;
      font-size: 24px;
    }
    .success-hero p {
      margin: 0;
      color: #065f46;
      font-weight: 600;
      font-size: 18px;
    }
    
    /* Status badge */
    .status-badge {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 10px 0;
    }
    
    /* Details card */
    .details-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      position: relative;
    }
    .details-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #10b981, #059669);
      border-radius: 12px 12px 0 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 12px;
      align-items: center;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
      margin-right: 15px;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }
    
    /* Instructions section */
    .instructions-section {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .instructions-section h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .instructions-section p {
      color: #1e3a8a;
      line-height: 1.7;
    }
    
    /* Button */
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      margin: 15px 0;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    }
    
    /* Footer */
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #64748b;
    }
    .footer .logo {
      font-weight: 700;
      color: #059669;
      font-size: 16px;
    }
    .footer .celebration {
      font-size: 20px;
      margin-bottom: 15px;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0 10px;
        border-radius: 8px;
      }
      .header, .content {
        padding: 25px 20px;
      }
      .details-card, .success-hero, .instructions-section {
        padding: 20px;
      }
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .detail-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px 0;">
        <div class="email-container">
          <!-- Header -->
    <div class="header">
            <div class="icon">🎉</div>
            <h1>Parabéns!</h1>
            <h2>Sua inscrição foi aprovada</h2>
    </div>
          
          <!-- Content -->
    <div class="content">
            <div class="success-hero">
              <h3>Inscrição Aprovada!</h3>
              <p>Olá <strong>${approvedData.participantName}</strong>, sua participação está confirmada!</p>
      </div>
      
            <div class="status-badge">✅ Aprovado</div>
            
            <div class="details-card">
              <h3>📋 Detalhes da Sua Participação</h3>
              <div class="detail-row">
                <span class="detail-label">ID da Inscrição:</span>
                <span class="detail-value">${approvedData.registrationId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Evento:</span>
                <span class="detail-value">${approvedData.assemblyName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Local:</span>
                <span class="detail-value">${approvedData.assemblyLocation}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Datas:</span>
                <span class="detail-value">${approvedData.assemblyDates}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Modalidade:</span>
                <span class="detail-value">${approvedData.modalityName}</span>
              </div>
      </div>
      
      ${approvedData.paymentAmount || approvedData.isPaymentExempt ? `
            <div class="payment-section">
              <h3>💳 Informações de Pagamento</h3>
              ${approvedData.isPaymentExempt ? `
                <div class="payment-exempt">
                  <p><strong>Status:</strong> Isento de Pagamento</p>
                  ${approvedData.paymentExemptReason ? `<p><strong>Motivo:</strong> ${approvedData.paymentExemptReason}</p>` : ''}
                </div>
              ` : `
                <div class="payment-required">
                  <p><strong>Valor:</strong> ${formatCurrency(approvedData.paymentAmount)}</p>
                  <p><strong>Status:</strong> Pagamento Confirmado</p>
                </div>
              `}
            </div>
            ` : ''}
      
      ${approvedData.additionalInstructions ? `
            <div class="instructions-section">
              <h3>📝 Instruções Importantes</h3>
        <p>${approvedData.additionalInstructions}</p>
      </div>
      ` : ''}
      
      ${approvedData.qrCodeUrl ? `
            <div class="details-card">
              <h3>📱 QR Code de Participação</h3>
              <p>Seu QR Code de participação está pronto! Use-o para fazer check-in no evento:</p>
              <a href="${approvedData.qrCodeUrl}" class="btn">Acessar Meu QR Code</a>
              <p style="font-size: 14px; color: #64748b; margin-top: 15px;">
                <strong>Dica:</strong> Salve este link nos seus favoritos para acesso rápido durante o evento.
              </p>
      </div>
      ` : ''}
            
            <h3>🌟 Próximos Passos</h3>
            <p>Sua inscrição está confirmada! Agora você pode:</p>
            <ul style="margin: 15px 0; padding-left: 25px; color: #374151;">
              <li>Marcar as datas na sua agenda</li>
              <li>Preparar-se para uma experiência incrível</li>
              <li>Ficar atento aos comunicados que enviaremos</li>
              <li>Entrar em contato conosco se tiver alguma dúvida</li>
            </ul>
    </div>
          
          <!-- Footer -->
    <div class="footer">
            <div class="celebration">🎊 🎉 🎊</div>
            <p class="logo">IFMSA Brazil</p>
            <p><strong>Nos vemos na assembleia!</strong></p>
            <p>Estudantes de Medicina que fazem a diferença</p>
            <p>Este email foi enviado automaticamente, por favor não responda.</p>
    </div>
  </div>
      </td>
    </tr>
  </table>
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
- Valor: ${formatCurrency(paymentData.paymentAmount)}
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
        <p><strong>Valor:</strong> ${formatCurrency(paymentData.paymentAmount)}</p>
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
- Valor Pago: ${formatCurrency(paymentConfirmData.paymentAmount)}
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
        <p><strong>Valor Pago:</strong> ${formatCurrency(paymentConfirmData.paymentAmount)}</p>
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