import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Toaster, toast } from 'react-hot-toast';
import { Zap, Battery, Cpu, Gauge, Smartphone, MonitorSmartphone, Monitor, X, Check, Leaf, CpuIcon, GpuIcon } from 'lucide-react';

const MainPage = () => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [activeProfile, setActiveProfile] = useState('unknown');
  const [cpuBoost, setCpuBoost] = useState(false);
  const [cpuModel, setCpuModel] = useState('Loading...');
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [currentGpuMode, setCurrentGpuMode] = useState('unknown');
  const [selectedGpuMode, setSelectedGpuMode] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingGpuMode, setPendingGpuMode] = useState(null);

  const profiles = [
    {
      id: 'performance',
      name: 'Performance',
      icon: Zap,
      description: 'Maximum power',
      color: 'from-yellow-400 to-orange-500',
      settings: { boost: true, daemon: 'performance' }
    },
    {
      id: 'balanced',
      name: 'Balanced',
      icon: Gauge,
      description: 'Best of both worlds',
      color: 'from-yellow-400 to-yellow-500',
      settings: { boost: true, daemon: 'balanced' }
    },
    {
      id: 'power-saver',
      name: 'Power Saver',
      icon: Leaf,
      description: 'Maximum battery life',
      color: 'from-green-500 to-emerald-600',
      settings: { boost: false, daemon: 'power-saver' }
    }
  ];

  const gpuModes = [
    {
      id: 'Integrated',
      name: 'Integrated',
      icon: CpuIcon,
      description: 'iGPU only - Best battery life',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'Hybrid',
      name: 'Hybrid',
      icon: MonitorSmartphone,
      description: 'Dynamic switching - Balanced',
      color: 'from-yellow-400 to-yellow-500'
    },
    {
      id: 'Dedicated',
      name: 'Dedicated',
      icon: GpuIcon,
      description: 'dGPU only - Max performance',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  // Load system stats on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await invoke('detect_stats');
        
        setCpuModel(stats.cpu_model);
        setCpuBoost(stats.cpu_boost === '1');
        setActiveProfile(stats.power_profile);
        
        const gpuMode = stats.gpu_mode;
        setCurrentGpuMode(gpuMode);
        setSelectedGpuMode(gpuMode);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to detect stats:', error);
        toast.error('Failed to load system information');
        setLoading(false);
      }
    }
    
    loadStats();
  }, []);

  // Poll battery status every 5 seconds
  useEffect(() => {
    async function updateBattery() {
      try {
        const battery = await invoke('get_battery_status');
        setBatteryLevel(battery.capacity);
        setIsCharging(battery.status === 'Charging');
      } catch (error) {
        console.error('Failed to get battery status:', error);
      }
    }
    
    updateBattery();
    const interval = setInterval(updateBattery, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleProfileChange = async (profileId) => {
    try {
      setLoading(true);
      
      const loadingToast = toast.loading('Applying power profile...');
      
      await invoke('set_profile', { profileName: profileId });
      
      // Refresh stats after profile change
      const stats = await invoke('detect_stats');
      setCpuBoost(stats.cpu_boost === '1');
      setActiveProfile(stats.power_profile);
      
      toast.success(`Switched to ${profileId.replace('-', ' ')} mode`, {
        id: loadingToast,
        icon: '⚡',
        duration: 3000,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to change profile:', error);
      toast.error(`Failed to change profile: ${error}`, {
        duration: 4000,
      });
      setLoading(false);
    }
  };

  const handleGpuApply = () => {
    if (selectedGpuMode !== currentGpuMode) {
      setPendingGpuMode(selectedGpuMode);
      setShowConfirmDialog(true);
    }
  };

  const confirmGpuChange = async () => {
    setShowConfirmDialog(false);
    
    try {
      setLoading(true);
      
      const loadingToast = toast.loading('Applying GPU mode...');
      
      await invoke('set_gpu_mode', { mode: pendingGpuMode });
      setCurrentGpuMode(pendingGpuMode);
      
      toast.success(
        'GPU mode will change after logout/reboot',
        {
          id: loadingToast,
          icon: '🔄',
          duration: 5000,
        }
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to change GPU mode:', error);
      toast.error(`Failed to change GPU mode: ${error}`, {
        duration: 4000,
      });
      setLoading(false);
    }
    
    setPendingGpuMode(null);
  };

  const cancelGpuChange = () => {
    setShowConfirmDialog(false);
    setPendingGpuMode(null);
  };

  if (loading && activeProfile === 'unknown') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-400">Loading system info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#facc15',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#000',
            },
          },
          loading: {
            iconTheme: {
              primary: '#facc15',
              secondary: '#000',
            },
          },
        }}
      />

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Confirm GPU Mode Change</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Switching to <span className="text-yellow-400 font-semibold">{pendingGpuMode}</span> GPU mode requires logout or reboot to take effect.
                </p>
                <p className="text-gray-400 text-sm">
                  Make sure to save your work before proceeding.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelGpuChange}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={confirmGpuChange}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-10 h-10 text-yellow-400" strokeWidth={2.5} />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            PowerCTL
          </h1>
        </div>
        <p className="text-gray-400 text-lg ml-13">Power management for Linux laptops</p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Status Bar */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-8 border border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-zinc-800 p-3 rounded-xl">
                <Cpu className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-400">CPU</p>
                <p className="text-lg font-semibold truncate">{cpuModel}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-zinc-800 p-3 rounded-xl">
                <Battery className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Battery</p>
                <p className="text-xl font-semibold">
                  {batteryLevel}% {isCharging && <span className="text-sm text-green-400">⚡</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-zinc-800 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">CPU Boost</p>
                <p className="text-xl font-semibold">{cpuBoost ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-zinc-800 p-3 rounded-xl">
                <Gauge className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Profile</p>
                <p className="text-xl font-semibold capitalize">{activeProfile.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'profiles'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            Power Profiles
          </button>
          <button
            onClick={() => setActiveTab('gpu')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'gpu'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            GPU Switching
          </button>
        </div>

        {/* Power Profiles Tab */}
        {activeTab === 'profiles' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {profiles.map((profile) => {
                const Icon = profile.icon;
                const isActive = activeProfile === profile.id;
                
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileChange(profile.id)}
                    disabled={loading}
                    className={`
                      relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isActive 
                        ? 'bg-gradient-to-br ' + profile.color + ' scale-105 shadow-2xl shadow-yellow-500/20' 
                        : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800'
                      }
                    `}
                  >
                    <div className="relative z-10">
                      <Icon className={`w-12 h-12 mb-4 ${isActive ? 'text-black' : 'text-yellow-400'}`} strokeWidth={2} />
                      <h3 className={`text-2xl font-bold mb-2 ${isActive ? 'text-black' : 'text-white'}`}>
                        {profile.name}
                      </h3>
                      <p className={`text-sm ${isActive ? 'text-black/70' : 'text-gray-400'}`}>
                        {profile.description}
                      </p>
                      
                      <div className={`mt-4 pt-4 border-t ${isActive ? 'border-black/20' : 'border-zinc-800'}`}>
                        <div className="flex flex-col gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className={isActive ? 'text-black/70' : 'text-gray-400'}>CPU Boost:</span>
                            <span className={`font-semibold ${isActive ? 'text-black' : 'text-white'}`}>
                              {profile.settings.boost ? 'On' : 'Off'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isActive ? 'text-black/70' : 'text-gray-400'}>Daemon:</span>
                            <span className={`font-semibold ${isActive ? 'text-black' : 'text-white'} capitalize`}>
                              {profile.settings.daemon}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isActive && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-black/20 rounded-full p-2">
                          <Zap className="w-5 h-5 text-black" fill="currentColor" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GPU Switching Tab */}
        {activeTab === 'gpu' && (
          <div>
            {/* Warning Banner */}
            <div className="bg-orange-900/30 border border-orange-500/50 rounded-xl p-4 mb-6">
              <p className="text-orange-300 font-semibold">
                ⚠️ GPU mode changes require logout or reboot to take effect
              </p>
            </div>

            {/* Current GPU Mode */}
            <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
              <p className="text-gray-400 text-sm mb-2">Current GPU Mode</p>
              <p className="text-2xl font-bold text-yellow-400 capitalize">{currentGpuMode}</p>
            </div>

            {/* GPU Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {gpuModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedGpuMode === mode.id;
                const isCurrent = currentGpuMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedGpuMode(mode.id)}
                    disabled={loading}
                    className={`
                      relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isSelected 
                        ? 'bg-gradient-to-br ' + mode.color + ' scale-105 shadow-2xl shadow-yellow-500/20' 
                        : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800'
                      }
                    `}
                  >
                    <div className="relative z-10">
                      <Icon className={`w-12 h-12 mb-4 ${isSelected ? 'text-black' : 'text-yellow-400'}`} strokeWidth={2} />
                      <h3 className={`text-2xl font-bold mb-2 ${isSelected ? 'text-black' : 'text-white'}`}>
                        {mode.name}
                      </h3>
                      <p className={`text-sm ${isSelected ? 'text-black/70' : 'text-gray-400'}`}>
                        {mode.description}
                      </p>
                      
                      {isCurrent && (
                        <div className="mt-3">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            isSelected ? 'bg-black/20 text-black' : 'bg-yellow-400/20 text-yellow-400'
                          }`}>
                            ACTIVE
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleGpuApply}
              disabled={selectedGpuMode === currentGpuMode || loading}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                selectedGpuMode === currentGpuMode || loading
                  ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black hover:scale-105'
              }`}
            >
              {selectedGpuMode === currentGpuMode ? 'No Changes to Apply' : 'Apply GPU Mode (Requires Restart)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPage;