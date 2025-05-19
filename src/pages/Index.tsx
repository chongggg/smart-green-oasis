
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { 
  Thermometer, 
  Droplet, 
  Sun, 
  Fan,
  Leaf,
  Settings,
  Calendar,
  History,
  Plus,
  ChartLine,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import { database } from '@/lib/firebase-config'; // Import from our new utility file
import { Dashboard } from '@/components/Dashboard';
import { Controls } from '@/components/Controls';
import { HistoricalData } from '@/components/HistoricalData';
import { AddPlant } from '@/components/AddPlant';
import { PlantList } from '@/components/PlantList';
import { Settings as SettingsComponent } from '@/components/Settings';
import { DataTable } from '@/components/DataTable';

// Remove duplicate Firebase configuration and initialization since we're importing from firebase-config.ts

const Index = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Sensor data
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    soil_moisture: 0,
    lighting: 0
  });
  
  // Actuator status
  const [actuatorStatus, setActuatorStatus] = useState({
    fan: false,
    pump: false,
    light: false
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
          lighting: data.lighting || 0
        });
        
        // Also update actuator status if available in sensor_data
        if (data.fan_status !== undefined || data.pump_status !== undefined || data.light_status !== undefined) {
          setActuatorStatus({
            fan: data.fan_status || false,
            pump: data.pump_status || false,
            light: data.light_status || false
          });
        }
      }
    });

    // Actuator status reference
    const actuatorStatusRef = ref(database, 'actuator_status');
    const unsubscribeActuator = onValue(actuatorStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setActuatorStatus({
          fan: data.fan || false,
          pump: data.pump || false,
          light: data.light || false
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
      unsubscribeActuator();
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
    settings: <Settings className="mr-2 h-4 w-4" />,
    rawdata: <Database className="mr-2 h-4 w-4" />
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="flex flex-col md:flex-row h-screen">
        {/* Sidebar */}
        <div className={`w-full md:w-64 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-5 md:h-screen shrink-0`}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-500" />
            <span>Greenhouse</span>
          </h1>
          
          <Separator className="my-4" />
          
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'controls', label: 'Controls' },
              { id: 'history', label: 'Historical Data' },
              { id: 'addplant', label: 'Add Plant' },
              { id: 'plantlist', label: 'Plant List' },
              { id: 'rawdata', label: 'Raw Data' },
              { id: 'settings', label: 'Settings' }
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab(item.id)}
              >
                {tabIcons[item.id as keyof typeof tabIcons]}
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <Dashboard 
              sensorData={sensorData} 
              actuatorStatus={actuatorStatus} 
              database={database}
            />
          )}
          
          {activeTab === 'controls' && (
            <Controls 
              automationEnabled={automationEnabled} 
              actuatorStatus={actuatorStatus}
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
          
          {activeTab === 'rawdata' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Raw Database Data</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataTable database={database} path="sensor_data" />
                <DataTable database={database} path="actuator_status" />
                <DataTable database={database} path="settings" />
                <DataTable database={database} path="history" />
              </div>
            </div>
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
