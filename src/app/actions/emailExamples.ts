'use server';

import { 
  sendRegistrationConfirmation,
  sendRegistrationApproval, 
  sendRegistrationRejection,
  sendPaymentReminder,
  sendPaymentConfirmation,
  sendResubmissionRequest,
  sendBulkEmails,
  type EmailData 
} from './sendEmail';
import { env } from '~/env.js';

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (date: Date): string => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

// Example usage functions for AG registration workflow

/**
 * Send confirmation email when a new registration is created
 */
export async function handleNewRegistration(registrationData: {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  assemblyLocation: string;
  assemblyStartDate: Date;
  assemblyEndDate: Date;
  modalityName: string;
  paymentRequired: boolean;
  paymentAmount?: number;
  isPaymentExempt?: boolean;
  paymentExemptReason?: string;
}) {
  const assemblyDates = `${formatDateWithoutTimezone(registrationData.assemblyStartDate)} - ${formatDateWithoutTimezone(registrationData.assemblyEndDate)}`;
  
  const result = await sendRegistrationConfirmation({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    assemblyLocation: registrationData.assemblyLocation,
    assemblyDates: assemblyDates,
    modalityName: registrationData.modalityName,
    paymentRequired: registrationData.paymentRequired,
    paymentAmount: registrationData.paymentAmount ? 
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(registrationData.paymentAmount / 100) : undefined,
    isPaymentExempt: registrationData.isPaymentExempt,
    paymentExemptReason: registrationData.paymentExemptReason,
  });

  if (!result.success) {
    console.error('Failed to send registration confirmation email:', result.error);
  }

  return result;
}

/**
 * Send approval email when registration is approved
 */
export async function handleRegistrationApproval(registrationData: {
  registrationId: string;
  assemblyId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  assemblyLocation: string;
  assemblyStartDate: Date;
  assemblyEndDate: Date;
  modalityName: string;
  additionalInstructions?: string;
  paymentAmount?: string;
  isPaymentExempt?: boolean;
  paymentExemptReason?: string;
}) {
  const assemblyDates = `${formatDateWithoutTimezone(registrationData.assemblyStartDate)} - ${formatDateWithoutTimezone(registrationData.assemblyEndDate)}`;
  
  const result = await sendRegistrationApproval({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    assemblyLocation: registrationData.assemblyLocation,
    assemblyDates: assemblyDates,
    modalityName: registrationData.modalityName,
    additionalInstructions: registrationData.additionalInstructions,
    qrCodeUrl: `https://admin.ifmsabrazil.org/ag/${registrationData.assemblyId}/qr-code?registration=${registrationData.registrationId}`,
    paymentAmount: registrationData.paymentAmount,
    isPaymentExempt: registrationData.isPaymentExempt,
    paymentExemptReason: registrationData.paymentExemptReason,
  });

  if (!result.success) {
    console.error('Failed to send registration approval email:', result.error);
  }

  return result;
}

/**
 * Send rejection email when registration is rejected
 */
export async function handleRegistrationRejection(registrationData: {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  rejectionReason: string;
  canResubmit: boolean;
}) {
  const result = await sendRegistrationRejection({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    rejectionReason: registrationData.rejectionReason,
    canResubmit: registrationData.canResubmit,
    resubmissionUrl: registrationData.canResubmit ? `${env.NEXTAUTH_URL}/ag/${registrationData.registrationId}/resubmit` : undefined,
    contactEmail: 'atendimento@ifmsabrazil.org',
  });

  if (!result.success) {
    console.error('Failed to send registration rejection email:', result.error);
  }

  return result;
}

/**
 * Send payment reminder email
 */
export async function handlePaymentReminder(registrationData: {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  paymentAmount: number;
  paymentDeadline: Date;
  pixKey?: string;
  bankDetails?: string;
}) {
  const result = await sendPaymentReminder({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    paymentAmount: `R$ ${registrationData.paymentAmount.toFixed(2)}`,
    paymentDeadline: formatDateWithoutTimezone(registrationData.paymentDeadline),
    paymentUrl: `${env.NEXTAUTH_URL}/ag/${registrationData.registrationId}/payment`,
    pixKey: registrationData.pixKey,
    bankDetails: registrationData.bankDetails,
  });

  if (!result.success) {
    console.error('Failed to send payment reminder email:', result.error);
  }

  return result;
}

/**
 * Send payment confirmation email
 */
export async function handlePaymentConfirmation(registrationData: {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  paymentAmount: number;
  paymentDate: Date;
  receiptNumber?: string;
}) {
  const result = await sendPaymentConfirmation({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    paymentAmount: `R$ ${registrationData.paymentAmount.toFixed(2)}`,
    paymentDate: formatDateWithoutTimezone(registrationData.paymentDate),
    receiptNumber: registrationData.receiptNumber,
  });

  if (!result.success) {
    console.error('Failed to send payment confirmation email:', result.error);
  }

  return result;
}

/**
 * Send resubmission request email
 */
export async function handleResubmissionRequest(registrationData: {
  registrationId: string;
  participantName: string;
  participantEmail: string;
  assemblyName: string;
  reasonForResubmission: string;
  resubmissionDeadline?: Date;
}) {
  const result = await sendResubmissionRequest({
    to: registrationData.participantEmail,
    participantName: registrationData.participantName,
    registrationId: registrationData.registrationId,
    assemblyName: registrationData.assemblyName,
    reasonForResubmission: registrationData.reasonForResubmission,
    resubmissionUrl: `${env.NEXTAUTH_URL}/ag/${registrationData.registrationId}/resubmit`,
    resubmissionDeadline: registrationData.resubmissionDeadline ? formatDateWithoutTimezone(registrationData.resubmissionDeadline) : undefined,
  });

  if (!result.success) {
    console.error('Failed to send resubmission request email:', result.error);
  }

  return result;
}

/**
 * Send bulk notification emails to all participants of an assembly
 */
export async function sendAssemblyNotification(
  assemblyId: string,
  subject: string,
  message: string,
  participants: Array<{
    name: string;
    email: string;
  }>,
  onProgress?: (sent: number, total: number, errors: string[]) => void
) {
  const emails: EmailData[] = participants.map(participant => ({
    type: 'generic' as const,
    data: {
      to: participant.email,
      participantName: participant.name,
      subject: subject,
      message: message,
    }
  }));

  const result = await sendBulkEmails(emails, onProgress);
  
  console.log(`Bulk email result: ${result.success} sent, ${result.failed} failed`);
  if (result.errors.length > 0) {
    console.error('Bulk email errors:', result.errors);
  }

  return result;
}

/**
 * Example automated workflow integration
 * This shows how you might integrate the email system with your existing AG registration workflow
 */
export async function processRegistrationStatusChange(
  registrationId: string,
  newStatus: 'pending' | 'approved' | 'rejected' | 'pending_review',
  registrationData: {
    participantName: string;
    participantEmail: string;
    assemblyName: string;
    assemblyLocation: string;
    assemblyStartDate: Date;
    assemblyEndDate: Date;
    modalityName: string;
    paymentRequired: boolean;
    paymentAmount?: number;
    rejectionReason?: string;
    additionalInstructions?: string;
    isPaymentExempt?: boolean;
    paymentExemptReason?: string;
  }
) {
  switch (newStatus) {
    case 'pending':
      // Send confirmation email when registration is first created
      return await handleNewRegistration({
        registrationId,
        ...registrationData,
      });

    case 'approved':
      // Send approval email
      return await handleRegistrationApproval({
        registrationId,
        assemblyId: 'assembly123',
        participantName: registrationData.participantName,
        participantEmail: registrationData.participantEmail,
        assemblyName: registrationData.assemblyName,
        assemblyLocation: registrationData.assemblyLocation,
        assemblyStartDate: registrationData.assemblyStartDate,
        assemblyEndDate: registrationData.assemblyEndDate,
        modalityName: registrationData.modalityName,
        additionalInstructions: registrationData.additionalInstructions,
        paymentAmount: registrationData.paymentAmount ? 
          new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(registrationData.paymentAmount / 100) : undefined,
        isPaymentExempt: registrationData.isPaymentExempt,
        paymentExemptReason: registrationData.paymentExemptReason,
      });

    case 'rejected':
      // Send rejection email with ability to resubmit
      return await handleRegistrationRejection({
        registrationId,
        participantName: registrationData.participantName,
        participantEmail: registrationData.participantEmail,
        assemblyName: registrationData.assemblyName,
        rejectionReason: registrationData.rejectionReason || 'Motivo não especificado',
        canResubmit: true,
      });

    case 'pending_review':
      // For pending review status, you might want to send an update to the participant
      // or notify admins - this is optional depending on your workflow
      break;

    default:
      console.warn('Unknown registration status:', newStatus);
      return { success: false, message: 'Unknown status' };
  }
}

/**
 * Error handling and retry mechanism for critical emails
 */
export async function sendCriticalEmail(emailData: EmailData, maxRetries = 5): Promise<{ success: boolean; message: string; finalAttempt: number }> {
  let lastResult;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    switch (emailData.type) {
      case 'registration_confirmation':
        lastResult = await sendRegistrationConfirmation(emailData.data);
        break;
      case 'registration_approved':
        lastResult = await sendRegistrationApproval(emailData.data);
        break;
      case 'registration_rejected':
        lastResult = await sendRegistrationRejection(emailData.data);
        break;
      case 'payment_reminder':
        lastResult = await sendPaymentReminder(emailData.data);
        break;
      case 'payment_confirmation':
        lastResult = await sendPaymentConfirmation(emailData.data);
        break;
      case 'resubmission_request':
        lastResult = await sendResubmissionRequest(emailData.data);
        break;
      default:
        return { success: false, message: 'Unsupported email type for critical sending', finalAttempt: attempt };
    }

    if (lastResult.success) {
      return { success: true, message: 'Email sent successfully', finalAttempt: attempt };
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { 
    success: false, 
    message: lastResult?.message || 'Failed after all retries', 
    finalAttempt: maxRetries 
  };
}

/**
 * Daily automated payment reminders
 * This could be run as a cron job or scheduled task
 */
export async function sendDailyPaymentReminders() {
  // This is a placeholder - you would integrate with your Convex database
  // to get pending payment registrations that need reminders
  
  console.log('Running daily payment reminders...');
  
  // Example logic:
  // 1. Query all registrations with status 'pending' and paymentRequired = true
  // 2. Filter those that haven't received a reminder in the last 24 hours
  // 3. Send reminder emails with rate limiting
  
  // const pendingPayments = await ctx.db.query("agRegistrations")
  //   .filter(q => q.and(
  //     q.eq(q.field("status"), "pending"),
  //     q.eq(q.field("paymentRequired"), true),
  //     // Add more filters for reminder timing
  //   ))
  //   .collect();
  
  // Process in batches to avoid overwhelming the email service
  // const results = await sendBulkEmails(reminderEmails, (sent, total, errors) => {
  //   console.log(`Payment reminders: ${sent}/${total} sent, ${errors.length} errors`);
  // });
  
  return { message: 'Daily payment reminders completed' };
} 