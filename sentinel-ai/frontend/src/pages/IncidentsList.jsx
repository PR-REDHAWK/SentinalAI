import React, { useState } from 'react';
import { useIncidents } from '../context/IncidentContext';
import IncidentTable from '../components/IncidentTable';
import IncidentCard from '../components/IncidentCard';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import { Search, LayoutGrid, ListFilter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IncidentsList = () => {
  const { incidents } = useIncidents();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.affectedService.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || inc.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || inc.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">All System Incidents</h1>
          <p className="text-xs text-slate-400 mt-1">Browse, filter, and review active and historical system outages.</p>
        </div>
        <Button variant="gradient" icon={Plus} onClick={() => navigate('/report')}>
          Report Incident
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <Input
            placeholder="Filter by title, ID, microservice..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Severities' },
                { value: 'Critical', label: 'Critical' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' }
              ]}
            />
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Investigating', label: 'Investigating' },
                { value: 'Active', label: 'Active' },
                { value: 'Mitigated', label: 'Mitigated' },
                { value: 'Resolved', label: 'Resolved' }
              ]}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Table View"
            >
              <ListFilter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Display */}
      {filteredIncidents.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center text-slate-400">
          No incidents match the selected search criteria.
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <IncidentTable incidents={filteredIncidents} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIncidents.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} />
          ))}
        </div>
      )}
    </div>
  );
};

export default IncidentsList;
