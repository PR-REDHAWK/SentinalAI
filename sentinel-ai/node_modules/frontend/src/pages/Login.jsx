import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

export const Login = () => {
  const [email, setEmail] = useState('alex.vance@sentinel.ai');
  const [password, setPassword] = useState('••••••••••••');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-2xl p-8 border border-slate-800/80 shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            Sentinel<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">
            AI-Powered Incident Intelligence Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Work Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0" />
              Remember device
            </label>
            <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium">Forgot password?</a>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            icon={ArrowRight}
          >
            Sign In to Incident Console
          </Button>
        </form>

        {/* Demo Callout */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>Interactive Prototype - Click Sign In to access</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
