
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
  Gauge,
  Server,
  Wifi,
  Clock,
  Activity,
  BellRing,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

import { database } from '@/lib/firebase-config';
import { Dashboard } from '@/components/Dashboard';
import { Controls } from '@/components/Controls';
import { HistoricalData } from '@/components/HistoricalData';
import { AddPlant } from '@/components/AddPlant';
import { PlantList } from '@/components/PlantList';
import { Settings as SettingsComponent } from '@/components/Settings';
import { SystemInfo } from '@/components/SystemInfo';
import { Notifications } from '@/components/Notifications';
import { Analytics } from '@/components/Analytics';

const Index = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  
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
  
  // Threshold values
  const [thresholds, setThresholds] = useState({
    temperature: 31,
    moisture: 20,
    light: 20,
    mode: 'manual',
    season: 'wet'
  });
  
  // System information
  const [systemInfo, setSystemInfo] = useState({
    free_heap: 0,
    last_update: '',
    status: 'offline',
    uptime: '',
    wifi_rssi: 0
  });
  
  // Automation status
  const [automationEnabled, setAutomationEnabled] = useState(true);
  
  // Notification count
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Theme switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Fetch plants for analytics
  useEffect(() => {
    const plantsRef = ref(database, 'plants');
    const unsubscribe = onValue(plantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const plantsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPlants(plantsArray);
      }
    });
    
    return () => unsubscribe();
  }, []);

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
    
    // Threshold values reference
    const tempThreshRef = ref(database, 'settings/temp_threshold');
    const moistThreshRef = ref(database, 'settings/moisture_threshold');
    const lightThreshRef = ref(database, 'settings/light_threshold');
    const modeRef = ref(database, 'settings/threshold_mode');
    const seasonRef = ref(database, 'settings/selected_season');
    
    const unsubscribeTemp = onValue(tempThreshRef, (snapshot) => {
      if (snapshot.exists()) {
        setThresholds(prev => ({ ...prev, temperature: snapshot.val() }));
      }
    });
    
    const unsubscribeMoisture = onValue(moistThreshRef, (snapshot) => {
      if (snapshot.exists()) {
        setThresholds(prev => ({ ...prev, moisture: snapshot.val() }));
      }
    });
    
    const unsubscribeLight = onValue(lightThreshRef, (snapshot) => {
      if (snapshot.exists()) {
        setThresholds(prev => ({ ...prev, light: snapshot.val() }));
      }
    });
    
    const unsubscribeMode = onValue(modeRef, (snapshot) => {
      if (snapshot.exists()) {
        setThresholds(prev => ({ ...prev, mode: snapshot.val() }));
      }
    });
    
    const unsubscribeSeason = onValue(seasonRef, (snapshot) => {
      if (snapshot.exists()) {
        setThresholds(prev => ({ ...prev, season: snapshot.val() }));
      }
    });
    
    // System information reference
    const systemRef = ref(database, 'system');
    const unsubscribeSystem = onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSystemInfo({
          free_heap: data.free_heap || 0,
          last_update: data.last_update || '',
          status: data.status || 'offline',
          uptime: data.uptime || '',
          wifi_rssi: data.wifi_rssi || 0
        });
      }
    });
    
    // Count unread notifications
    const notificationsRef = ref(database, 'notifications');
    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationArray = Object.values(data) as any[];
        setUnreadNotifications(notificationArray.filter(n => !n.read).length);
      } else {
        setUnreadNotifications(0);
      }
    });

    return () => {
      unsubscribeSensor();
      unsubscribeAutomation();
      unsubscribeTemp();
      unsubscribeMoisture();
      unsubscribeLight();
      unsubscribeMode();
      unsubscribeSeason();
      unsubscribeSystem();
      unsubscribeNotifications();
    };
  }, []);

  // Format uptime to human readable
  const formatUptime = (seconds: string) => {
    const uptimeSeconds = parseInt(seconds);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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
              { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="mr-2 h-4 w-4" /> },
              { id: 'notifications', label: 'Notifications', icon: <BellRing className="mr-2 h-4 w-4" />, badge: unreadNotifications },
              { id: 'history', label: 'Historical Data', icon: <History className="mr-2 h-4 w-4" /> },
              { id: 'addplant', label: 'Add Plant', icon: <Plus className="mr-2 h-4 w-4" /> },
              { id: 'plantlist', label: 'Plant List', icon: <ChartLine className="mr-2 h-4 w-4" /> },
              { id: 'system', label: 'System Info', icon: <Server className="mr-2 h-4 w-4" /> },
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
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
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
            
            {/* Thresholds display */}
            <h3 className="text-sm font-medium text-muted-foreground mt-4">Thresholds</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Thermometer className="h-3 w-3 text-red-500" />
                <span>Temp: {thresholds.temperature}°C</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Droplet className="h-3 w-3 text-orange-500" />
                <span>Soil: {thresholds.moisture}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Sun className="h-3 w-3 text-amber-500" />
                <span>Light: {thresholds.light}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Gauge className="h-3 w-3 text-emerald-500" />
                <Badge variant="outline" className="text-[10px] py-0 h-5">
                  {thresholds.mode === 'manual' ? 'Manual' : 
                   thresholds.mode === 'season' ? thresholds.season.charAt(0).toUpperCase() + thresholds.season.slice(1) + ' Season' : 
                   'Crop Specific'}
                </Badge>
              </div>
            </div>
            
            {/* System Info Summary */}
            <h3 className="text-sm font-medium text-muted-foreground mt-4">System Status</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Activity className="h-3 w-3 text-emerald-500" />
                <Badge variant={systemInfo.status === 'online' ? 'default' : 'destructive'} className="text-[10px] py-0 h-5">
                  {systemInfo.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>Up: {formatUptime(systemInfo.uptime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Wifi className="h-3 w-3 text-blue-500" />
                <span>WiFi: {systemInfo.wifi_rssi} dBm</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Server className="h-3 w-3 text-purple-500" />
                <span>Mem: {Math.round(systemInfo.free_heap/1024)} KB</span>
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
          
          {activeTab === 'analytics' && (
            <Analytics 
              database={database}
              plants={plants}
            />
          )}
          
          {activeTab === 'notifications' && (
            <Notifications
              database={database}
              sensorData={sensorData}
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
          
          {activeTab === 'system' && (
            <SystemInfo systemInfo={systemInfo} database={database} toast={toast} />
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
