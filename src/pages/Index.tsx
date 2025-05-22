import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { 
  Leaf,
  Settings,
  History,
  Plus,
  ChartLine,
  Sprout,
  Sun,
  Thermometer,
  Droplet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

import { database } from '@/lib/firebase-config';
import { Dashboard } from '@/components/Dashboard';
import { Controls } from '@/components/Controls';
import { HistoricalData } from '@/components/HistoricalData';
import { AddPlant } from '@/components/AddPlant';
import { PlantList } from '@/components/PlantList';
import { Settings as SettingsComponent } from '@/components/Settings';

const Index = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Sensor data
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    soil_moisture: 0,
    lighting: 0,
    fan_status: false,
    pump_status: false,
    light_status: false
  });
  
  // Automation status
  const [automationEnabled, setAutomationEnabled] = useState(true);
  
  // Theme switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Listen to Firebase data
  useEffect(() => {
    // Sensor data reference
    const sensorDataRef = ref(database, 'sensor_data');
    const unsubscribeSensor = onValue(sensorDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData({
          temperature: data.temperature || 0,
          humidity: data.humidity || 0,
          soil_moisture: data.soil_moisture || 0,
          lighting: data.lighting || 0,
          fan_status: data.fan_status || false,
          pump_status: data.pump_status || false,
          light_status: data.light_status || false
        });
      }
    });

    // Automation status reference
    const automationRef = ref(database, 'settings/automation');
    const unsubscribeAutomation = onValue(automationRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setAutomationEnabled(data);
      }
    });

    return () => {
      unsubscribeSensor();
      unsubscribeAutomation();
    };
  }, []);

  // Tab icons mapping
  const tabIcons = {
    dashboard: <Leaf className="mr-2 h-4 w-4" />,
    controls: <Settings className="mr-2 h-4 w-4" />,
    history: <History className="mr-2 h-4 w-4" />,
    addplant: <Plus className="mr-2 h-4 w-4" />,
    plantlist: <ChartLine className="mr-2 h-4 w-4" />,
    settings: <Settings className="mr-2 h-4 w-4" />
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex flex-col md:flex-row h-screen">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-sidebar p-5 md:h-screen shrink-0 border-r">
          <div className="flex items-center gap-2">
            <Sprout className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-bold">Greenhouse</h1>
          </div>
          
          <Separator className="my-4" />
          
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Leaf className="mr-2 h-4 w-4" /> },
              { id: 'controls', label: 'Controls', icon: <Settings className="mr-2 h-4 w-4" /> },
              { id: 'history', label: 'Historical Data', icon: <History className="mr-2 h-4 w-4" /> },
              { id: 'addplant', label: 'Add Plant', icon: <Plus className="mr-2 h-4 w-4" /> },
              { id: 'plantlist', label: 'Plant List', icon: <ChartLine className="mr-2 h-4 w-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="mr-2 h-4 w-4" /> }
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start ${activeTab === item.id ? 'bg-sidebar-primary text-sidebar-primary-foreground' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
          
          {/* Environment Summary */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Environment</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Thermometer className="h-3 w-3 text-red-500" />
                <span>{sensorData.temperature.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Droplet className="h-3 w-3 text-blue-500" />
                <span>{sensorData.humidity.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Droplet className="h-3 w-3 text-orange-500" />
                <span>{sensorData.soil_moisture.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Sun className="h-3 w-3 text-amber-500" />
                <span>{sensorData.lighting}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <Dashboard 
              sensorData={sensorData} 
              actuatorStatus={{
                fan: sensorData.fan_status,
                pump: sensorData.pump_status,
                light: sensorData.light_status
              }} 
              database={database}
            />
          )}
          
          {activeTab === 'controls' && (
            <Controls 
              automationEnabled={automationEnabled} 
              actuatorStatus={{
                fan: sensorData.fan_status,
                pump: sensorData.pump_status,
                light: sensorData.light_status
              }}
              database={database}
              toast={toast}
            />
          )}
          
          {activeTab === 'history' && (
            <HistoricalData database={database} />
          )}
          
          {activeTab === 'addplant' && (
            <AddPlant database={database} toast={toast} />
          )}
          
          {activeTab === 'plantlist' && (
            <PlantList database={database} toast={toast} />
          )}
          
          {activeTab === 'settings' && (
            <SettingsComponent 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
