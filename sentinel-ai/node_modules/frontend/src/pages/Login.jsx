import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  PlusCircle,
  BrainCircuit,
  Activity,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-slate-950 bg-grid-pattern flex flex-col justify-between p-6 md:p-10 relative overflow-hidden">
      {/* Subtle Ambient Glows using project indigo/sky palette */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-100">
            Sentinel<span className="text-indigo-400">AI</span>
          </span>
        </div>

        <Link to="/report">
          <Button variant="outline" size="sm" icon={PlusCircle}>
            Public Incident Report
          </Button>
        </Link>
      </header>

      {/* Main Centered Split Container (Asana-inspired generous layout) */}
      <main className="w-full max-w-6xl mx-auto my-auto py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-panel rounded-3xl p-8 md:p-12 lg:p-14 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center"
        >
          {/* Left Column: Outcome-oriented Headline + Frictionless Form */}
          <div className="lg:col-span-5 space-y-7">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 leading-tight">
                {isSignUp
                  ? 'One click away from faster incident resolution'
                  : 'Resolve outages faster with less guesswork'}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {isSignUp
                  ? 'Create your engineer account to correlate telemetry and isolate root causes in seconds.'
                  : 'Sign in to your SentinelAI console to inspect live telemetry and grounded root cause analysis.'}
              </p>
            </div>

            {localError && (
              <div className="p-3 rounded-lg bg-red-950/40 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <Input
                  label="Full Name"
                  type="text"
                  icon={UserIcon}
                  placeholder="Alex Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}

              <Input
                label="Work Email"
                type="email"
                icon={Mail}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                icon={Lock}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                icon={ArrowRight}
                disabled={loading}
              >
                {loading
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                  : (isSignUp ? 'Continue' : 'Sign In')}
              </Button>
            </form>

            <div className="space-y-3 pt-2 text-xs text-slate-400">
              {isSignUp ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setLocalError(''); }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  New to SentinelAI?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setLocalError(''); }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                  >
                    Create account
                  </button>
                </p>
              )}

              <p className="text-slate-500">
                Need to flag an outage without signing in?{' '}
                <Link
                  to="/report"
                  className="text-slate-300 hover:text-indigo-400 underline transition-colors"
                >
                  Report an incident
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column: Dashboard Sneak Peek */}
          <div className="lg:col-span-7 hidden md:block">
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/60 p-8 lg:p-10 overflow-hidden min-h-[420px] flex items-center justify-center">
              {/* Subtle glow inside preview container */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Main Preview Window */}
              <div className="w-full max-w-lg bg-slate-950/90 rounded-2xl p-5 shadow-2xl space-y-4 relative z-10 translate-x-4 -translate-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-100">Live Incident Stream</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                </div>

                {/* Preview Table Rows */}
                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-12 text-slate-500 font-medium px-2 pb-1">
                    <span className="col-span-6">Incident</span>
                    <span className="col-span-3">Severity</span>
                    <span className="col-span-3 text-right">Status</span>
                  </div>

                  <div className="grid grid-cols-12 items-center bg-slate-900/70 rounded-lg px-3 py-2.5">
                    <span className="col-span-6 font-medium text-slate-200 truncate">Auth Gateway 504 Timeout</span>
                    <span className="col-span-3 text-red-400 font-medium">Critical</span>
                    <span className="col-span-3 text-right text-indigo-400">Investigating</span>
                  </div>

                  <div className="grid grid-cols-12 items-center bg-slate-900/50 rounded-lg px-3 py-2.5">
                    <span className="col-span-6 font-medium text-slate-300 truncate">DB Connection Pool Exhaustion</span>
                    <span className="col-span-3 text-orange-400 font-medium">High</span>
                    <span className="col-span-3 text-right text-sky-400">Mitigated</span>
                  </div>

                  <div className="grid grid-cols-12 items-center bg-slate-900/40 rounded-lg px-3 py-2.5">
                    <span className="col-span-6 font-medium text-slate-400 truncate">CDN Cache Miss Increase</span>
                    <span className="col-span-3 text-blue-400 font-medium">Low</span>
                    <span className="col-span-3 text-right text-emerald-400 flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating AI Synthesis Card (Asana AI callout inspiration) */}
              <div className="absolute bottom-6 left-6 w-72 bg-slate-900/95 backdrop-blur-md rounded-xl p-4 shadow-2xl space-y-2.5 z-20">
                <div className="flex items-center gap-2 text-indigo-400">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-100">Correlated with SentinelAI</span>
                </div>
                <p className="text-xs text-slate-300 bg-sky-950/40 rounded-lg p-2.5 leading-relaxed">
                  Database connection pool reached 98% capacity 4 minutes after release v4.3.0.
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">94% Confidence</span>
                  <span className="text-[11px] font-semibold text-indigo-400">Inspect Root Cause</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center md:text-left text-xs text-slate-600 relative z-10">
        SentinelAI Incident Intelligence Platform
      </footer>
    </div>
  );
};

export default Login;
