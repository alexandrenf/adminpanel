import { NextResponse } from 'next/server';
import { testEmailConfiguration, testRegistrationConfirmation, emailSystemHealthCheck } from '~/app/actions/emailTest';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type');

    let result;
    switch (testType) {
      case 'basic':
        result = await testEmailConfiguration();
        break;
      case 'registration':
        result = await testRegistrationConfirmation();
        break;
      case 'health':
        result = await emailSystemHealthCheck();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: basic, registration, or health' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { error: 'Failed to run email test', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 