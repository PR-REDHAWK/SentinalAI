import React, { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { Sliders, Cpu, Bell, Shield, Database, Save, Check } from 'lucide-react';

export const Settings = () => {
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Platform Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure SentinelAI engine parameters, integrations, and notification thresholds.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Engine Settings */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Cpu className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">AI Model & Vector Search Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Primary LLM Provider"
              defaultValue="gemini-1.5-pro"
              options={[
                { value: 'gemini-1.5-pro', label: 'Google Gemini 1.5 Pro (Recommended)' },
                { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
                { value: 'claude-3-5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' }
              ]}
            />

            <Select
              label="Vector Search Similarity Threshold"
              defaultValue="0.85"
              options={[
                { value: '0.90', label: '90% Strict Similarity' },
                { value: '0.85', label: '85% Balanced (Default)' },
                { value: '0.75', label: '75% Broad Matching' }
              ]}
            />
          </div>

          <Input
            label="Vector Embedding Model"
            defaultValue="text-embedding-004"
            disabled
          />
        </div>

        {/* Integration Credentials */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Database className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">Ingestion Webhooks & Telemetry</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Datadog Webhook Endpoint"
              defaultValue="https://api.sentinel.ai/v1/webhooks/datadog"
            />

            <Input
              label="PagerDuty API Access Token"
              type="password"
              defaultValue="pd_live_98412984129841298412"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <Button variant="gradient" size="md" icon={saved ? Check : Save} type="submit">
            {saved ? 'Settings Saved!' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
