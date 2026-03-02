import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, Activity, Database, AlertCircle, CheckCircle2, Terminal, Plus, Trash2, Lock, Unlock, Tag, ListChecks, Download, Upload, Info, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ga4Agent, GA4Config, GA4EventLog, EVENT_TYPES, CustomEventDef } from './services/ga4Agent';
import { README_CONTENT } from './constants/readme';
import { ProductHackersLogo } from './components/ProductHackersLogo';

export default function App() {
  const [config, setConfig] = useState<GA4Config>({
    measurementId: '',
    apiSecret: '',
    eventsPerMinute: 60,
    customEvents: [],
    selectedStandardEvents: EVENT_TYPES.map(name => ({ name, weight: 1 })),
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<GA4EventLog[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0 });
  
  const [autoScroll, setAutoScroll] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Custom Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [newEventWeight, setNewEventWeight] = useState(1);
  const [tempParams, setTempParams] = useState<Record<string, string>>({});

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    ga4Agent.onLog((log) => {
      setLogs((prev) => [...prev.slice(-99), log]); // Keep last 100 logs
      setStats((prev) => ({
        total: prev.total + 1,
        success: prev.success + (log.status === 'success' ? 1 : 0),
        error: prev.error + (log.status === 'error' ? 1 : 0),
      }));
    });

    return () => {
      ga4Agent.stop();
    };
  }, []);

  const handleStart = () => {
    if (!config.measurementId || !config.apiSecret) {
      alert('Please provide both Measurement ID and API Secret.');
      return;
    }
    if (config.selectedStandardEvents.length === 0 && config.customEvents.length === 0) {
      alert('Please select at least one standard event or create a custom event.');
      return;
    }
    ga4Agent.setConfig(config);
    ga4Agent.start();
    setIsRunning(true);
  };

  const handleStop = () => {
    ga4Agent.stop();
    setIsRunning(false);
  };

  const toggleStandardEvent = (eventName: string) => {
    setConfig(prev => {
      const isSelected = prev.selectedStandardEvents.some(e => e.name === eventName);
      let newSelected;
      if (isSelected) {
        newSelected = prev.selectedStandardEvents.filter(e => e.name !== eventName);
      } else {
        newSelected = [...prev.selectedStandardEvents, { name: eventName, weight: 1 }];
      }
      return { ...prev, selectedStandardEvents: newSelected };
    });
  };

  const updateStandardEventWeight = (eventName: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      selectedStandardEvents: prev.selectedStandardEvents.map(e => 
        e.name === eventName ? { ...e, weight } : e
      )
    }));
  };

  const addTempParam = () => {
    if (newParamKey && newParamValue) {
      setTempParams({ ...tempParams, [newParamKey]: newParamValue });
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const removeTempParam = (key: string) => {
    const updated = { ...tempParams };
    delete updated[key];
    setTempParams(updated);
  };

  const addCustomEvent = () => {
    if (newEventName) {
      setConfig({
        ...config,
        customEvents: [
          ...config.customEvents,
          { id: Math.random().toString(36).substring(7), name: newEventName, params: tempParams, weight: newEventWeight }
        ]
      });
      setNewEventName('');
      setTempParams({});
      setNewEventWeight(1);
    }
  };

  const removeCustomEvent = (id: string) => {
    setConfig({
      ...config,
      customEvents: config.customEvents.filter(e => e.id !== id)
    });
  };

  const updateCustomEventWeight = (id: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      customEvents: prev.customEvents.map(e => 
        e.id === id ? { ...e, weight } : e
      )
    }));
  };

  const downloadTemplate = () => {
    const csvContent = "event_name,param_key,param_value\ngenerate_lead,formID,410\ngenerate_lead,formProfile,Comprador\ngenerate_lead,formPermission,1\ninvalid_form,formID,410\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "custom_events_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      const newEventsMap = new Map<string, Record<string, string>>();
      
      // Skip header (i=1)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        const eventName = parts[0]?.trim();
        const paramKey = parts[1]?.trim();
        const paramValue = parts[2]?.trim();

        if (eventName) {
          if (!newEventsMap.has(eventName)) {
            newEventsMap.set(eventName, {});
          }
          if (paramKey && paramValue) {
            newEventsMap.get(eventName)![paramKey] = paramValue;
          }
        }
      }

      const parsedEvents: CustomEventDef[] = Array.from(newEventsMap.entries()).map(([name, params]) => ({
        id: Math.random().toString(36).substring(7),
        name,
        params,
        weight: 1
      }));

      setConfig(prev => ({
        ...prev,
        customEvents: [...prev.customEvents, ...parsedEvents]
      }));
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const exportBlueprint = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ga4-agent-blueprint.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importBlueprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedConfig = JSON.parse(text) as GA4Config;
        
        if (parsedConfig && typeof parsedConfig === 'object') {
          setConfig({
            measurementId: parsedConfig.measurementId || '',
            apiSecret: parsedConfig.apiSecret || '',
            eventsPerMinute: parsedConfig.eventsPerMinute || 60,
            customEvents: parsedConfig.customEvents || [],
            selectedStandardEvents: parsedConfig.selectedStandardEvents || []
          });
        } else {
          alert('Invalid blueprint format.');
        }
      } catch (error) {
        alert('Error parsing blueprint file.');
        console.error(error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-white font-sans p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none flex justify-between items-center mb-6 border-b border-[#262626] pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-500" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight">GA4 Data Generator</h1>
            <span className="text-xs text-neutral-500 font-medium ml-1 mt-1">by</span>
            <a href="https://www.producthackers.com/" target="_blank" rel="noopener noreferrer" className="flex items-center mt-1 opacity-90 hover:opacity-100 transition-opacity text-white">
              <ProductHackersLogo className="h-7 w-auto" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] border border-[#262626] rounded-full text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>Info & Manual</span>
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
            <span className="text-sm font-mono text-neutral-400">
              {isRunning ? 'AGENT ACTIVE' : 'AGENT IDLE'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Column: Config, Standard Events, Custom Events & Stats */}
        <div className="space-y-6 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Configuration Panel */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-400" />
                <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">Configuration</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={exportBlueprint} className="text-xs flex items-center gap-1 text-neutral-400 hover:text-emerald-400 transition-colors" title="Export Blueprint JSON">
                  <Download className="w-3 h-3" /> Export
                </button>
                <label className="text-xs flex items-center gap-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer" title="Import Blueprint JSON">
                  <Upload className="w-3 h-3" /> Import
                  <input type="file" accept=".json" className="hidden" onChange={importBlueprint} disabled={isRunning} />
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase">Measurement ID</label>
                <input
                  type="text"
                  value={config.measurementId}
                  onChange={(e) => setConfig({ ...config, measurementId: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  disabled={isRunning}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase">API Secret</label>
                <input
                  type="password"
                  value={config.apiSecret}
                  onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  disabled={isRunning}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase">Events / Minute</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="600"
                    value={config.eventsPerMinute}
                    onChange={(e) => setConfig({ ...config, eventsPerMinute: parseInt(e.target.value) })}
                    disabled={isRunning}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-sm font-mono w-12 text-right">{config.eventsPerMinute}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Agent
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-lg py-3 font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Agent
                </button>
              )}
            </div>
          </div>

          {/* Standard Events Panel */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shrink-0">
            <div className="flex items-center gap-2 mb-6">
              <ListChecks className="w-5 h-5 text-neutral-400" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">Standard Events</h2>
            </div>
            <div className="space-y-3">
              {EVENT_TYPES.map(evt => {
                const selected = config.selectedStandardEvents.find(e => e.name === evt);
                const isChecked = !!selected;
                return (
                  <div key={evt} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-[#0a0a0a] border border-[#262626] rounded-lg p-3">
                    <label className="flex items-center gap-2 text-sm font-mono text-neutral-300 cursor-pointer hover:text-white transition-colors flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStandardEvent(evt)}
                        disabled={isRunning}
                        className="w-4 h-4 accent-emerald-500 bg-[#0a0a0a] border-[#262626] rounded cursor-pointer disabled:opacity-50 shrink-0"
                      />
                      <span className="truncate" title={evt}>{evt}</span>
                    </label>
                    {isChecked && (
                      <div className="flex items-center gap-2 w-full sm:w-32 shrink-0 border-t sm:border-t-0 border-[#262626] pt-2 sm:pt-0 mt-1 sm:mt-0">
                        <span className="text-xs text-neutral-500">Weight:</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={selected.weight}
                          onChange={(e) => updateStandardEventWeight(evt, parseInt(e.target.value))}
                          disabled={isRunning}
                          className="flex-1 accent-emerald-500 h-1 min-w-[60px]"
                        />
                        <span className="text-xs font-mono text-neutral-400 w-4 text-right shrink-0">{selected.weight}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Events Panel */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-neutral-400" />
                <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">Custom Events</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-neutral-400 hover:text-emerald-400 transition-colors" title="Download CSV Template">
                  <Download className="w-3 h-3" /> Template
                </button>
                <label className="text-xs flex items-center gap-1 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer" title="Upload CSV">
                  <Upload className="w-3 h-3" /> Upload
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isRunning} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {/* List of existing custom events */}
              {config.customEvents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {config.customEvents.map(evt => (
                    <div key={evt.id} className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-emerald-400">{evt.name}</div>
                          <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-1">
                            {Object.entries(evt.params).map(([k, v]) => (
                              <span key={k} className="bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#333]">{k}: {v}</span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => removeCustomEvent(evt.id)} className="text-neutral-500 hover:text-red-500 transition-colors" disabled={isRunning}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#262626]">
                        <span className="text-xs text-neutral-500">Weight:</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={evt.weight}
                          onChange={(e) => updateCustomEventWeight(evt.id, parseInt(e.target.value))}
                          disabled={isRunning}
                          className="flex-1 accent-emerald-500 h-1"
                        />
                        <span className="text-xs font-mono text-neutral-400 w-4 text-right">{evt.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new custom event form */}
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase">Event Name</label>
                  <input
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g., button_click"
                    disabled={isRunning}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase">Parameters</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newParamKey}
                      onChange={(e) => setNewParamKey(e.target.value)}
                      placeholder="Key"
                      disabled={isRunning}
                      className="flex-1 w-1/2 bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      placeholder="Value"
                      disabled={isRunning}
                      className="flex-1 w-1/2 bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={addTempParam}
                      disabled={isRunning || !newParamKey || !newParamValue}
                      className="bg-[#262626] hover:bg-[#333] text-white px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {Object.keys(tempParams).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(tempParams).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-neutral-300">
                          <span>{k}: {v}</span>
                          <button onClick={() => removeTempParam(k)} disabled={isRunning} className="text-neutral-500 hover:text-red-400 ml-1">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-neutral-500">Weight:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newEventWeight}
                    onChange={(e) => setNewEventWeight(parseInt(e.target.value))}
                    disabled={isRunning}
                    className="flex-1 accent-emerald-500 h-1"
                  />
                  <span className="text-xs font-mono text-neutral-400 w-4 text-right">{newEventWeight}</span>
                </div>

                <button
                  onClick={addCustomEvent}
                  disabled={isRunning || !newEventName}
                  className="w-full bg-[#262626] hover:bg-[#333] text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 mt-2"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shrink-0">
            <div className="flex items-center gap-2 mb-6">
              <Database className="w-5 h-5 text-neutral-400" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">Session Stats</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                <div className="text-xs font-mono text-neutral-500 uppercase mb-1">Total Sent</div>
                <div className="text-2xl font-light">{stats.total}</div>
              </div>
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                <div className="text-xs font-mono text-neutral-500 uppercase mb-1">Success Rate</div>
                <div className="text-2xl font-light text-emerald-500">
                  {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 col-span-2 flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono text-neutral-500 uppercase mb-1">Errors</div>
                  <div className="text-xl font-light text-red-500">{stats.error}</div>
                </div>
                {stats.error > 0 && <AlertCircle className="w-5 h-5 text-red-500 opacity-50" />}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Log Viewer */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl flex flex-col min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-[#262626] bg-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">Live Event Stream</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs font-mono text-neutral-500 hidden sm:block">
                Showing last 100 events
              </div>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border transition-colors ${
                  autoScroll 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {autoScroll ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                Auto-scroll
              </button>
            </div>
          </div>
          
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar"
          >
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-600 italic">
                Waiting for events...
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded border ${
                    log.status === 'success' 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      <span className="text-neutral-400">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {log.eventName}
                      </span>
                    </div>
                    <span className="text-neutral-500 truncate max-w-[150px]" title={log.clientId}>
                      client: {log.clientId.split('-')[0]}...
                    </span>
                  </div>
                  <div className="text-neutral-300 pl-5 opacity-80 break-all">
                    {JSON.stringify(log.payload.events[0].params)}
                  </div>
                  {log.error && (
                    <div className="text-red-400 pl-5 mt-1">
                      Error: {log.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowInfoModal(false)}>
          <div 
            className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#262626] shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-white">Information & Manual</h2>
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="prose prose-invert max-w-none [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-emerald-400 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>p]:text-neutral-300 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:text-neutral-300 [&>li]:mb-2 [&>hr]:border-[#262626] [&>hr]:my-8 [&>a]:text-emerald-400 [&>a]:underline hover:[&>a]:text-emerald-300 [&>strong]:text-white">
                <ReactMarkdown>{README_CONTENT}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
