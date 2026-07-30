import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, Lock, User as UserIcon, Sparkles, ArrowRight, AlertCircle, PlusCircle } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.vance@sentinel.ai');
  const [password, setPassword] = useState('password123');
  const [localError, setLocalError] = useState('');

  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (isSignUp) {
      if (!name.trim()) {
        setLocalError('Please enter your full name');
        return;
      }
      const res = await register(name, email, password, 'Engineer');
      if (res.success) {
        navigate('/dashboard');
      } else {
        setLocalError(res.message);
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setLocalError(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Link to Public Incident Report */}
      <div className="absolute top-6 right-6">
        <Link to="/report">
          <Button variant="outline" size="sm" icon={PlusCircle}>
            Public Incident Report
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-2xl p-8 border border-slate-800/80 shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            Sentinel<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">
            {isSignUp ? 'Engineer Registration Portal' : 'Engineer Access & Incident Console'}
          </p>
        </div>

        {/* Local Error Alert */}
        {localError && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <Input
              label="Full Name"
              type="text"
              icon={UserIcon}
              placeholder="e.g. Alex Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Work Email"
            type="email"
            icon={Mail}
            placeholder="engineer@sentinel.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full mt-2"
            icon={ArrowRight}
            disabled={loading}
          >
            {loading 
              ? (isSignUp ? 'Creating Account...' : 'Authenticating...') 
              : (isSignUp ? 'Create Engineer Account' : 'Sign In to Console')
            }
          </Button>
        </form>

        {/* Toggle Login / Sign Up */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isSignUp ? (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setLocalError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New DevOps/Site Reliability Engineer?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setLocalError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

        {/* Public Report Banner Callout */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 mb-2">Not an engineer?</p>
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-indigo-500/50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Report an Outage Anonymously</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
