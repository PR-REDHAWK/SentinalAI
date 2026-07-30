import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, Send, Cpu, Globe, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { useIncidents } from '../context/IncidentContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';

const AI_PROCESSING_STEPS = [
  "Parsing natural language incident report",
  "Extracting affected services",
  "Correlating historical incidents",
  "Performing root cause analysis",
  "Calculating severity score",
  "Predicting business impact",
  "Generating remediation recommendations",
  "Finalizing incident intelligence report"
];

export const ReportIncident = () => {
  const navigate = useNavigate();
  const { addIncident } = useIncidents();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('High');
  const [category, setCategory] = useState('Authentication');
  const [affectedService, setAffectedService] = useState('Auth Service');
  const [region, setRegion] = useState('Global');
  
  const [isRecording, setIsRecording] = useState(false);
  const [showAIProcessingModal, setShowAIProcessingModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const handleVoiceToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulated voice speech-to-text transcript appending
      setTimeout(() => {
        setTitle("European Users Experiencing 504 Gateway Timeout on Login");
        setDescription("After deployment release v4.3, users in European regions are getting 504 gateway timeout errors when submitting authentication requests. Database connections appear unhandled.");
        setIsRecording(false);
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setShowAIProcessingModal(true);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (showAIProcessingModal && currentStep < AI_PROCESSING_STEPS.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 800); // 800ms per step simulation
      return () => clearTimeout(timer);
    } else if (showAIProcessingModal && currentStep === AI_PROCESSING_STEPS.length) {
      // All steps completed
      const finalizeTimer = setTimeout(() => {
        const created = addIncident({
          title,
          description,
          severity,
          category,
          affectedService,
          region
        });
        setShowAIProcessingModal(false);
        navigate(isAuthenticated ? `/incidents/${created.id}` : '/login');
      }, 1500);
      return () => clearTimeout(finalizeTimer);
    }
  }, [showAIProcessingModal, currentStep, navigate, addIncident, title, description, severity, category, affectedService, region, isAuthenticated]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          Report New System Outage
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Describe the issue in natural language or use voice reporting. SentinelAI will structure and correlate it instantly.
        </p>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-6 border border-slate-800 space-y-6 relative z-10"
      >
        {/* Voice Input Callout Box */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Natural Speech-to-Text Reporting</span>
            </div>
            <p className="text-xs text-slate-400">
              Click the microphone button and speak directly to log incident notes automatically.
            </p>
          </div>

          <Button
            type="button"
            variant={isRecording ? 'danger' : 'secondary'}
            size="md"
            icon={isRecording ? MicOff : Mic}
            onClick={handleVoiceToggle}
            className={isRecording ? 'animate-pulse' : ''}
          >
            {isRecording ? 'Listening...' : 'Voice Input'}
          </Button>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Incident Title"
            placeholder="e.g. EU Region API Gateway 504 Timeout Spikes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Severity Priority"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[
                { value: 'Critical', label: '🔴 Critical - Outage across core services' },
                { value: 'High', label: '🟠 High - Significant customer impact' },
                { value: 'Medium', label: '🟡 Medium - Non-critical service degraded' },
                { value: 'Low', label: '🔵 Low - Minor internal issue' }
              ]}
            />

            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Authentication', label: 'Authentication & IAM' },
                { value: 'Payment Pipeline', label: 'Payment & Billing' },
                { value: 'Database', label: 'Database & Storage' },
                { value: 'Search & Analytics', label: 'Search & Indexing' },
                { value: 'CDN & Assets', label: 'CDN & Network' },
                { value: 'Infrastructure', label: 'Infrastructure & Kubernetes' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Affected Service / Microservice"
              placeholder="e.g. auth-service-eu"
              icon={Cpu}
              value={affectedService}
              onChange={(e) => setAffectedService(e.target.value)}
              required
            />

            <Input
              label="Affected Region / Cluster"
              placeholder="e.g. Europe (eu-west-1)"
              icon={Globe}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          <Textarea
            label="Unstructured Incident Description & Error Logs"
            rows={5}
            placeholder="Paste logs, Slack discussions, monitoring alerts, or natural language problem descriptions here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            >
              {isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="md"
              icon={Send}
            >
              Run AI Analysis & Log Incident
            </Button>
          </div>
        </form>
      </motion.div>

      {/* AI Processing Modal */}
      <AnimatePresence>
        {showAIProcessingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with animated particles/grid feel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md bg-grid-pattern overflow-hidden flex items-center justify-center"
            >
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </motion.div>

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              className="relative w-full max-w-lg glass-panel rounded-2xl p-8 border border-slate-700 shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)] z-10 overflow-hidden"
            >
              {/* Top Logo and Glowing Effects */}
              <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-50 animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-400 shadow-xl text-white">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {currentStep >= AI_PROCESSING_STEPS.length ? 'Analysis Complete' : 'Analyzing Incident...'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
                    Our AI is processing the incident and generating intelligent insights.
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.min(currentStep, AI_PROCESSING_STEPS.length) / AI_PROCESSING_STEPS.length) * 100}%` }}
                  transition={{ ease: "easeInOut", duration: 0.8 }}
                />
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {AI_PROCESSING_STEPS.map((step, index) => {
                  const isCompleted = currentStep > index;
                  const isActive = currentStep === index;
                  const isPending = currentStep < index;

                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: isPending ? 0.4 : 1, 
                        x: 0,
                        scale: isActive ? 1.02 : 1
                      }}
                      className={`flex items-center gap-4 transition-all duration-300 ${isActive ? 'text-indigo-300' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </motion.div>
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <span className={`text-sm ${isActive ? 'font-medium' : 'font-normal'}`}>
                        {step}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportIncident;
