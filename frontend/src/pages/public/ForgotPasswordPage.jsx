import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-4">CC</div>
          <h1 className="text-2xl font-bold text-cream">Reset password</h1>
          <p className="text-muted text-sm mt-1">We'll email you a reset link</p>
        </div>

        {sent ? (
          <div className="card text-center">
            <div className="text-3xl mb-3">✉️</div>
            <p className="text-cream font-medium mb-2">Check your inbox</p>
            <p className="text-sm text-muted mb-6">If that email is registered, you'll receive a reset link shortly.</p>
            <Link to="/login" className="btn-primary w-full block text-center">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <Link to="/login" className="block text-center text-sm text-muted hover:text-cream transition-colors">← Back to Sign In</Link>
          </form>
        )}
      </div>
    </div>
  );
}
