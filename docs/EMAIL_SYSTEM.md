# Email System Documentation

## Overview

This email system provides a comprehensive solution for sending confirmation, approval, and rejection emails for AG (Assembly General) registrations using nodemailer. It includes robust error handling, retry mechanisms, rate limiting, and beautiful HTML email templates.

## Features

- 🎯 **Multiple Email Types**: Confirmation, approval, rejection, payment reminders, etc.
- 🔁 **Retry Logic**: Automatic retry with exponential backoff
- 📧 **HTML Templates**: Beautiful, responsive email templates
- 🚦 **Rate Limiting**: Built-in delays for bulk email sending
- 🛡️ **Security**: Email validation and content sanitization
- 📊 **Progress Tracking**: Real-time progress for bulk operations
- 🔧 **TypeScript**: Full type safety
- 🎨 **Customizable**: Easy to extend with new email types

## Environment Variables

Add these to your `.env` file:

```env
GMAIL_USERNAME=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
WEBMASTER_EMAIL=admin@ifmsabrazil.org
```

**Important**: Use Gmail App Passwords, not your regular password. Learn how to create one [here](https://support.google.com/accounts/answer/185833).

## Email Types

### 1. Registration Confirmation
Sent when a new registration is created.

```typescript
import { sendRegistrationConfirmation } from '~/app/actions/sendEmail';

await sendRegistrationConfirmation({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  assemblyLocation: 'São Paulo, SP',
  assemblyDates: '15/03/2024 - 17/03/2024',
  modalityName: 'Participante',
  paymentRequired: true,
  paymentAmount: 'R$ 150,00',
  registrationUrl: 'https://admin.ifmsabrazil.org/ag/REG123/payment'
});
```

### 2. Registration Approval
Sent when a registration is approved.

```typescript
import { sendRegistrationApproval } from '~/app/actions/sendEmail';

await sendRegistrationApproval({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  assemblyLocation: 'São Paulo, SP',
  assemblyDates: '15/03/2024 - 17/03/2024',
  modalityName: 'Participante',
  additionalInstructions: 'Lembre-se de trazer um documento de identidade.',
  qrCodeUrl: 'https://admin.ifmsabrazil.org/ag/REG123/qr-code'
});
```

### 3. Registration Rejection
Sent when a registration is rejected.

```typescript
import { sendRegistrationRejection } from '~/app/actions/sendEmail';

await sendRegistrationRejection({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  rejectionReason: 'Documentos incompletos. Favor reenviar com todos os comprovantes.',
  canResubmit: true,
  resubmissionUrl: 'https://admin.ifmsabrazil.org/ag/REG123/resubmit',
  contactEmail: 'admin@ifmsabrazil.org'
});
```

### 4. Payment Reminder
Sent to remind participants about pending payments.

```typescript
import { sendPaymentReminder } from '~/app/actions/sendEmail';

await sendPaymentReminder({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  paymentAmount: 'R$ 150,00',
  paymentDeadline: '10/03/2024',
  paymentUrl: 'https://admin.ifmsabrazil.org/ag/REG123/payment',
  pixKey: '12345678901',
  bankDetails: 'Banco do Brasil - Agência 1234 - Conta 56789-0'
});
```

### 5. Payment Confirmation
Sent when a payment is confirmed.

```typescript
import { sendPaymentConfirmation } from '~/app/actions/sendEmail';

await sendPaymentConfirmation({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  paymentAmount: 'R$ 150,00',
  paymentDate: '08/03/2024',
  receiptNumber: 'REC789'
});
```

### 6. Resubmission Request
Sent when asking participants to resubmit their registration.

```typescript
import { sendResubmissionRequest } from '~/app/actions/sendEmail';

await sendResubmissionRequest({
  to: 'participant@example.com',
  participantName: 'João Silva',
  registrationId: 'REG123',
  assemblyName: 'AG Nacional 2024',
  reasonForResubmission: 'Por favor, atualize suas informações de contato.',
  resubmissionUrl: 'https://admin.ifmsabrazil.org/ag/REG123/resubmit',
  resubmissionDeadline: '12/03/2024'
});
```

## Bulk Email Sending

Send emails to multiple participants with progress tracking:

```typescript
import { sendBulkEmails, type EmailData } from '~/app/actions/sendEmail';

const emails: EmailData[] = participants.map(participant => ({
  type: 'generic',
  data: {
    to: participant.email,
    participantName: participant.name,
    subject: 'Important Assembly Update',
    message: 'The assembly location has been changed...'
  }
}));

const result = await sendBulkEmails(emails, (sent, total, errors) => {
  console.log(`Progress: ${sent}/${total} sent, ${errors.length} errors`);
});

console.log(`Final result: ${result.success} sent, ${result.failed} failed`);
```

## Integration with AG Registration Workflow

Use the helper functions to automatically send emails based on status changes:

```typescript
import { processRegistrationStatusChange } from '~/app/actions/emailExamples';

// In your registration update logic
await processRegistrationStatusChange(
  registrationId,
  'approved', // new status
  {
    participantName: 'João Silva',
    participantEmail: 'joao@example.com',
    assemblyName: 'AG Nacional 2024',
    assemblyLocation: 'São Paulo, SP',
    assemblyStartDate: new Date('2024-03-15'),
    assemblyEndDate: new Date('2024-03-17'),
    modalityName: 'Participante',
    paymentRequired: true,
    paymentAmount: 150.00,
    additionalInstructions: 'Traga documento de identidade'
  }
);
```

## Error Handling

All email functions return a consistent result format:

```typescript
interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}
```

### Example Error Handling

```typescript
const result = await sendRegistrationConfirmation(data);

if (!result.success) {
  console.error('Email failed:', result.error);
  
  // Implement your error handling strategy:
  // - Log to monitoring service
  // - Retry later
  // - Alert administrators
  // - Store in failed email queue
}
```

### Critical Email Sending

For important emails that must be delivered, use the retry mechanism:

```typescript
import { sendCriticalEmail } from '~/app/actions/emailExamples';

const result = await sendCriticalEmail({
  type: 'registration_approved',
  data: approvalData
}, 5); // 5 retries

console.log(`Email sent after ${result.finalAttempt} attempts`);
```

## Edge Cases Handled

1. **Invalid Email Addresses**: Validates emails before sending
2. **Network Failures**: Automatic retry with exponential backoff
3. **Rate Limiting**: Built-in delays between bulk emails
4. **Authentication Issues**: Graceful error handling for Gmail auth
5. **Content Sanitization**: Prevents email injection attacks
6. **Connection Timeouts**: Configurable timeouts for all operations
7. **Large Recipient Lists**: Progress tracking and error isolation
8. **HTML Injection**: Content sanitization for user-provided content

## Best Practices

### 1. Environment Setup
```env
# Use App Passwords for Gmail
GMAIL_USERNAME=your-app-email@gmail.com
GMAIL_PASSWORD=your-16-character-app-password

# Set a professional reply-to address
WEBMASTER_EMAIL=admin@ifmsabrazil.org
```

### 2. Error Monitoring
```typescript
// Log all email attempts for monitoring
const result = await sendEmail(emailData);
if (!result.success) {
  // Send to your monitoring service (Sentry, LogRocket, etc.)
  logger.error('Email send failed', {
    recipient: emailData.data.to,
    type: emailData.type,
    error: result.error,
    messageId: result.messageId
  });
}
```

### 3. Rate Limiting for Bulk Operations
```typescript
// For large lists, consider batching
const batchSize = 50;
const emailBatches = chunk(emails, batchSize);

for (const batch of emailBatches) {
  await sendBulkEmails(batch);
  // Wait between batches to avoid overwhelming the service
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### 4. Template Customization
The HTML templates are embedded in the code but can be easily customized:

```typescript
// In generateEmailContent function, modify the HTML structure
html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* Add your custom styles here */
    .custom-header { background: linear-gradient(45deg, #007bff, #0056b3); }
  </style>
</head>
<body>
  <!-- Your custom template -->
</body>
</html>
`
```

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Use Gmail App Password, not regular password
   - Enable 2FA on Gmail account
   - Check GMAIL_USERNAME and GMAIL_PASSWORD in .env

2. **"Connection timeout"**
   - Check internet connection
   - Gmail SMTP might be temporarily unavailable
   - Consider increasing timeout values

3. **"Rate limit exceeded"**
   - Gmail has daily sending limits
   - Increase delays between emails
   - Consider using a dedicated email service for high volume

4. **"Invalid email address"**
   - Email validation is strict
   - Check for typos in recipient addresses
   - Ensure proper email format

### Debug Mode

Enable detailed logging:

```typescript
// Add to your environment for debugging
NODE_ENV=development

// The system will log detailed information about:
// - SMTP connection attempts
// - Email validation results  
// - Retry attempts
// - Network errors
```

## Performance Considerations

- **Rate Limiting**: 1 second delay between emails by default
- **Connection Reuse**: Transporter connection is reused when possible
- **Timeouts**: 60-second connection timeout, 30-second send timeout
- **Memory Usage**: Large recipient lists are processed sequentially
- **Retry Strategy**: Exponential backoff prevents overwhelming the service

## Security Features

- **Email Validation**: RFC 5321 compliant validation
- **Content Sanitization**: Prevents HTML/JavaScript injection
- **Secure Headers**: Proper email headers for authenticity
- **Environment Variables**: Sensitive data stored securely
- **Reply-To Protection**: Uses webmaster email for replies

## Future Enhancements

Consider implementing:

1. **Email Queue System**: For better reliability and performance
2. **Template Engine**: External template files for easier customization
3. **Analytics**: Track open rates, click rates, etc.
4. **A/B Testing**: Test different email versions
5. **Unsubscribe Handling**: Manage unsubscribe requests
6. **Email Verification**: Verify email addresses before sending
7. **Scheduled Sending**: Send emails at optimal times

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review environment variable configuration
3. Test with a simple email first
4. Check Gmail account settings and App Password
5. Monitor console logs for detailed error messages 