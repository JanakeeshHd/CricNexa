import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="glass p-8 rounded-2xl w-full max-w-md border border-neon-blue/20 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-neon-blue mx-auto mb-4" />
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-pink">
            Admin Login
          </h2>
          <p className="text-gray-400 mt-2">Access the secure admin panel</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="email"
                type="email"
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cricpulse.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="password"
                type="password"
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gradient-to-r from-neon-blue to-blue-600 text-white font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
