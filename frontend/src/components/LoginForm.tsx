import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Welcome Back</h2>
      <p className="auth-subtitle">Sign in to continue creating courses</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-switch">
        Don't have an account?{' '}
        <button onClick={onSwitchToRegister} className="link-button">
          Sign up
        </button>
      </div>

      <div className="demo-credentials">
        <p><strong>Demo Account:</strong></p>
        <p>Email: demo@booktocourse.local</p>
        <p>Password: password123</p>
      </div>
    </div>
  );
}
