'use server';

import { sendEmail, sendRegistrationConfirmation } from './sendEmail';
import { env } from '~/env.js';
import { getServerAuthSession } from '~/server/auth';

/**
 * Test function to verify email configuration is working
 * Call this from a server action or API route to test your setup
 */
export async function testEmailConfiguration() {
  console.log('Testing email configuration...');
  
  // Get the current user's session
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    return {
      success: false,
      message: 'No authenticated user found',
      error: 'UNAUTHORIZED'
    };
  }

  const testEmail = {
    type: 'generic' as const,
    data: {
      to: session.user.email,
      participantName: session.user.name || 'Test User',
      subject: 'Email System Test',
      message: `
Email system test performed at ${new Date().toISOString()}

This is a test message to verify that:
✅ Environment variables are configured correctly
✅ Mailtrap API authentication is working
✅ Email templates are rendering properly

If you received this email, your email system is working correctly!

Configuration details:
- Recipient: ${session.user.email}
- Environment: ${env.NODE_ENV}
      `,
    }
  };

  try {
    console.log('Sending test email with configuration:', {
      to: testEmail.data.to,
      from: "no-reply@assembleia.ifmsabrazil.org",
      environment: env.NODE_ENV
    });

    const result = await sendEmail(testEmail);
    
    if (result.success) {
      console.log('✅ Email test successful!', {
        messageId: result.messageId,
        recipient: testEmail.data.to
      });
      
      return {
        success: true,
        message: 'Test email sent successfully! Check your Mailtrap inbox.',
        details: {
          messageId: result.messageId,
          recipient: testEmail.data.to,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      console.error('❌ Email test failed:', {
        error: result.error,
        message: result.message
      });
      
      return {
        success: false,
        message: 'Email test failed',
        error: result.error,
        troubleshooting: [
          'Check your Mailtrap API token in .env file',
          'Verify the API token has the correct permissions',
          'Check Mailtrap API status and rate limits'
        ]
      };
    }
  } catch (error) {
    console.error('❌ Email test error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Email test encountered an unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check environment variables are properly set',
        'Verify Mailtrap API token is valid',
        'Check network connectivity',
        'Review server logs for detailed error information'
      ]
    };
  }
}

/**
 * Test registration confirmation email
 */
export async function testRegistrationConfirmation() {
  console.log('Testing registration confirmation email...');
  
  const testData = {
    to: env.WEBMASTER_EMAIL,
    participantName: 'João Silva (Test)',
    registrationId: 'TEST-REG-' + Date.now(),
    assemblyName: 'AG Nacional 2024 - TESTE',
    assemblyLocation: 'São Paulo, SP',
    assemblyDates: '15/03/2024 - 17/03/2024',
    modalityName: 'Participante - Teste',
    paymentRequired: true,
    paymentAmount: 'R$ 150,00',
    registrationUrl: `${env.NEXTAUTH_URL}/test/payment`,
  };

  try {
    const result = await sendRegistrationConfirmation(testData);
    
    if (result.success) {
      console.log('✅ Registration confirmation test successful!');
      return {
        success: true,
        message: 'Registration confirmation email sent successfully!',
        messageId: result.messageId
      };
    } else {
      console.error('❌ Registration confirmation test failed:', result.error);
      return {
        success: false,
        message: 'Registration confirmation test failed',
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Registration confirmation test error:', error);
    return {
      success: false,
      message: 'Registration confirmation test encountered an error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Comprehensive email system health check
 */
export async function emailSystemHealthCheck() {
  console.log('Running email system health check...');
  
  const results = {
    overall: false,
    timestamp: new Date().toISOString(),
    checks: {
      environmentVariables: false,
      basicEmailSending: false,
      registrationEmail: false,
      errorHandling: false
    },
    details: {} as Record<string, any>
  };

  // Check 1: Environment Variables
  try {
    const requiredVars = ['GMAIL_USERNAME', 'GMAIL_PASSWORD', 'WEBMASTER_EMAIL'];
    const missingVars = requiredVars.filter(varName => !env[varName as keyof typeof env]);
    
    if (missingVars.length === 0) {
      results.checks.environmentVariables = true;
      results.details.environmentVariables = { status: 'OK', message: 'All required environment variables are set' };
    } else {
      results.details.environmentVariables = { 
        status: 'FAILED', 
        message: `Missing environment variables: ${missingVars.join(', ')}` 
      };
    }
  } catch (error) {
    results.details.environmentVariables = { 
      status: 'ERROR', 
      message: 'Error checking environment variables',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check 2: Basic Email Sending
  if (results.checks.environmentVariables) {
    try {
      const basicTest = await testEmailConfiguration();
      results.checks.basicEmailSending = basicTest.success;
      results.details.basicEmailSending = basicTest;
    } catch (error) {
      results.details.basicEmailSending = {
        success: false,
        message: 'Basic email test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check 3: Registration Email Template
  if (results.checks.basicEmailSending) {
    try {
      const regTest = await testRegistrationConfirmation();
      results.checks.registrationEmail = regTest.success;
      results.details.registrationEmail = regTest;
    } catch (error) {
      results.details.registrationEmail = {
        success: false,
        message: 'Registration email test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check 4: Error Handling
  try {
    // Test invalid email address handling
    const invalidEmailTest = await sendEmail({
      type: 'generic',
      data: {
        to: 'invalid-email-address',
        participantName: 'Test',
        subject: 'Test',
        message: 'Test'
      }
    });
    
    // Should fail with invalid email error
    if (!invalidEmailTest.success && invalidEmailTest.error === 'INVALID_EMAIL') {
      results.checks.errorHandling = true;
      results.details.errorHandling = { status: 'OK', message: 'Error handling is working correctly' };
    } else {
      results.details.errorHandling = { 
        status: 'FAILED', 
        message: 'Error handling not working as expected',
        details: invalidEmailTest
      };
    }
  } catch (error) {
    results.details.errorHandling = {
      status: 'ERROR',
      message: 'Error testing error handling',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Overall health
  results.overall = Object.values(results.checks).every(check => check === true);

  console.log('Email system health check completed:', results);
  return results;
}

/**
 * Quick verification function for deployment
 */
export async function verifyEmailSystem() {
  const health = await emailSystemHealthCheck();
  
  if (health.overall) {
    console.log('🎉 Email system is fully operational!');
    return { status: 'healthy', message: 'Email system is working correctly' };
  } else {
    console.error('⚠️ Email system has issues:', health.details);
    return { 
      status: 'unhealthy', 
      message: 'Email system has configuration or connectivity issues',
      details: health.details
    };
  }
} 