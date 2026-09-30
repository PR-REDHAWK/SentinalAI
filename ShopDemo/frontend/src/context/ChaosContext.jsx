import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const ChaosContext = createContext();

const CHAOS_API_BASE = 'http://localhost:5100/api/chaos';
const SOCKET_URL = 'http://localhost:5100';

export const ChaosProvider = ({ children }) => {
  const [simulationState, setSimulationState] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('simulator-tick', (data) => {
      setSimulationState(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const triggerScenario = async (scenarioName) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${CHAOS_API_BASE}/trigger`, { scenario: scenarioName });
      setSimulationState(res.data.state);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setActionLoading(false);
    }
  };

  const startBlindTest = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${CHAOS_API_BASE}/blind-test`);
      setSimulationState(res.data.state);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setActionLoading(false);
    }
  };

  const revealGroundTruth = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${CHAOS_API_BASE}/reveal`);
      setSimulationState(res.data.fullState);
      return { success: true, revelation: res.data.revelation };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setActionLoading(false);
    }
  };

  const resetEnvironment = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${CHAOS_API_BASE}/reset`);
      setSimulationState(res.data.state);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ChaosContext.Provider
      value={{
        simulationState,
        socketConnected,
        actionLoading,
        triggerScenario,
        startBlindTest,
        revealGroundTruth,
        resetEnvironment
      }}
    >
      {children}
    </ChaosContext.Provider>
  );
};

export const useChaos = () => useContext(ChaosContext);
