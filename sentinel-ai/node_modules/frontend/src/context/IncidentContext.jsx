import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { initialIncidents, mockDashboardStats } from '../data/mockData';

const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [stats, setStats] = useState(mockDashboardStats);
  const [user, setUser] = useState({
    name: "Alex Vance",
    role: "Lead Incident Commander",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
  });

  useEffect(() => {
    // Initialize Socket.IO client
    const socket = io('http://localhost:5000');

    socket.on('new-incident', (newIncident) => {
      // Map MongoDB incident to frontend format if needed, assuming backend matches mostly
      const formattedIncident = {
        ...newIncident,
        id: newIncident._id, // frontend uses 'id' instead of '_id'
        confidenceScore: newIncident.aiScore || 0,
        impactedUsers: newIncident.businessImpact?.affectedUsers ? parseInt(newIncident.businessImpact.affectedUsers) || 0 : 0
      };
      
      setIncidents(prev => {
        // Prevent duplicates
        if (prev.find(i => i.id === formattedIncident.id)) return prev;
        return [formattedIncident, ...prev];
      });
      
      setStats(prev => ({
        ...prev,
        activeIncidents: prev.activeIncidents + 1,
        criticalIncidents: formattedIncident.severity === "Critical" ? prev.criticalIncidents + 1 : prev.criticalIncidents
      }));
    });

    socket.on('incident-updated', (updatedIncident) => {
      const formattedIncident = {
        ...updatedIncident,
        id: updatedIncident._id,
        confidenceScore: updatedIncident.aiScore || 0,
        impactedUsers: updatedIncident.businessImpact?.affectedUsers ? parseInt(updatedIncident.businessImpact.affectedUsers) || 0 : 0
      };

      setIncidents(prev => prev.map(inc => 
        inc.id === formattedIncident.id ? formattedIncident : inc
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addIncident = (newIncidentData) => {
    const newId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIncident = {
      id: newId,
      title: newIncidentData.title,
      description: newIncidentData.description,
      severity: newIncidentData.severity || "Medium",
      category: newIncidentData.category || "General",
      status: "Investigating",
      affectedService: newIncidentData.affectedService || "Core Platform",
      region: newIncidentData.region || "Global",
      impactedUsers: Math.floor(Math.random() * 50000) + 1000,
      confidenceScore: Math.floor(Math.random() * 15) + 85,
      createdAt: new Date().toISOString(),
      aiSummary: `AI analysis of ${newIncidentData.title}: Initial correlation indicates potential localized microservice anomaly in ${newIncidentData.affectedService || 'Core Platform'}.`,
      rootCause: {
        summary: `Possible configuration drift or dependency timeout in ${newIncidentData.affectedService || 'Core System'}`,
        confidence: 88,
        details: newIncidentData.description,
        evidence: [
          "Auto-detected latency shift across downstream endpoints",
          `User reported: "${newIncidentData.title}"`
        ]
      },
      businessImpact: {
        affectedUsers: "~15,000 estimated",
        regions: [newIncidentData.region || "Global"],
        estimatedRevenueLoss: "$1,200 / hr",
        serviceDegradation: "Elevated error rates on affected endpoints."
      },
      recommendations: [
        {
          id: `REC-${Math.floor(Math.random()*1000)}`,
          action: "Restart service pods",
          description: "Perform graceful rolling restart of affected containers.",
          confidence: 90,
          type: "Recovery",
          command: `kubectl rollout restart deployment/${(newIncidentData.affectedService || 'service').toLowerCase().replace(/\s+/g, '-')} -n prod`
        },
        {
          id: `REC-${Math.floor(Math.random()*1000)}`,
          action: "Inspect Application Logs",
          description: "Query Grafana Loki for recent stack traces.",
          confidence: 84,
          type: "Investigation",
          command: `logcli query '{app="${(newIncidentData.affectedService || 'service').toLowerCase().replace(/\s+/g, '-')}"}'`
        }
      ],
      timeline: [
        { id: 1, timestamp: new Date().toISOString(), type: "incident", title: "Incident Reported", description: `Submitted manually via SentinelAI portal: ${newIncidentData.title}` },
        { id: 2, timestamp: new Date(Date.now() + 1000).toISOString(), type: "ai", title: "AI Analysis Complete", description: "Structured JSON model populated and correlated with active telemetry." }
      ]
    };

    setIncidents(prev => [newIncident, ...prev]);
    setStats(prev => ({
      ...prev,
      activeIncidents: prev.activeIncidents + 1,
      criticalIncidents: newIncidentData.severity === "Critical" ? prev.criticalIncidents + 1 : prev.criticalIncidents
    }));

    return newIncident;
  };

  const updateIncidentStatus = (id, newStatus) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === id) {
        const updated = { ...inc, status: newStatus };
        if (newStatus === "Resolved") {
          updated.timeline = [
            ...updated.timeline,
            { id: Date.now(), timestamp: new Date().toISOString(), type: "resolution", title: "Incident Resolved", description: `Status changed to Resolved by ${user.name}` }
          ];
        }
        return updated;
      }
      return inc;
    }));
  };

  return (
    <IncidentContext.Provider value={{
      incidents,
      stats,
      user,
      addIncident,
      updateIncidentStatus
    }}>
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidents = () => {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
};
