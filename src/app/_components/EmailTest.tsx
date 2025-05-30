'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function EmailTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async (type: 'basic' | 'registration' | 'health') => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/email/test?type=${type}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run test');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Email System Test</CardTitle>
        <CardDescription>
          Test the email system configuration and functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => runTest('basic')}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Basic Test
            </Button>
            <Button
              onClick={() => runTest('registration')}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registration Test
            </Button>
            <Button
              onClick={() => runTest('health')}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Health Check
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 