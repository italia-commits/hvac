import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    // In production, call API to verify email
    const verifyEmail = async () => {
      try {
        // const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    const timer = setTimeout(() => {
      setStatus('success');
    }, 1500);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Verifying your email...</h2>
            <p className="text-gray-500 dark:text-gray-400">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Email verified!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Your email has been successfully verified.</p>
            <Link to="/login" className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
              Sign in to your account
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Verification failed</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The verification link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}