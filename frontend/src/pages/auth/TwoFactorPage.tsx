import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function TwoFactorPage() {
  const { verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tempToken = (location.state as any)?.tempToken;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!tempToken) navigate('/login');
  }, [tempToken, navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyTwoFactor(fullCode, tempToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">HVAC RenewIQ</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Two-Factor Authentication</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-primary-600 dark:text-primary-400" size={32} />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Enter the 6-digit verification code from your authenticator app.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 text-center">{error}</div>
          )}

          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck size={18} />}
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <Link to="/login" className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:underline">
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}