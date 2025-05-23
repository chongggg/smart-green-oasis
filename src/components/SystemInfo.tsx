import React, { useState, useEffect } from 'react';
import { Database, ref, onValue } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Info,
  RefreshCw,
  Check,
  XCircle,
  Clock,
  Cpu,
  Battery,
  AlertTriangle,
  Server
} from 'lucide-react';

interface SystemInfoProps {
  database: Database;
  toast: any;
}

export const SystemInfo = ({ database, toast }: SystemInfoProps) => {
  const [systemStatus, setSystemStatus] = useState({
    connectivity: true,
    signalStrength: 85,
    batteryLevel: 72,
    memoryUsage: 43,
    lastSync: "05/15/2025, 10:34:23 AM", // Updated as requested
    errors: []
  });
  
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const systemRef = ref(database, 'system_status');
    const unsubscribe = onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Keep the last sync date as fixed, don't update from Firebase
        const { last_sync, ...rest } = data;
        setSystemStatus({
          ...rest,
          lastSync: "05/15/2025, 10:34:23 AM", // Keep this value fixed
          connectivity: true
        });
      }
    }, (error) => {
      console.error("Error fetching system status:", error);
      setSystemStatus(prev => ({
        ...prev,
        connectivity: false
      }));
    });
    
    return () => unsubscribe();
  }, [database]);
  
  const refreshStatus = async () => {
    setLoading(true);
    // Simulate refresh delay
    setTimeout(() => {
      toast({
        title: "System Status Refreshed",
        description: "Latest system information has been loaded."
      });
      setLoading(false);
    }, 1000);
  };
  
  const getSignalIcon = () => {
    const strength = systemStatus.signalStrength;
    if (strength > 75) return <SignalHigh className="text-green-500" />;
    if (strength > 50) return <SignalMedium className="text-amber-500" />;
    if (strength > 25) return <SignalLow className="text-orange-500" />;
    return <Signal className="text-red-500" />;
  };
  
  const getBatteryColor = () => {
    const level = systemStatus.batteryLevel;
    if (level > 60) return "text-green-500";
    if (level > 30) return "text-amber-500";
    return "text-red-500";
  };
  
  const getMemoryColor = () => {
    const usage = systemStatus.memoryUsage;
    if (usage < 50) return "text-green-500";
    if (usage < 80) return "text-amber-500";
    return "text-red-500";
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">System Information</h1>
        
        <Button 
          onClick={refreshStatus} 
          variant="outline" 
          size="sm"
          className="mt-2 md:mt-0"
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {systemStatus.connectivity ? 
                <Wifi className="text-green-500" /> : 
                <WifiOff className="text-red-500" />
              }
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-muted-foreground" />
                  <span>Signal Strength</span>
                </div>
                <div className="flex items-center gap-2">
                  {getSignalIcon()}
                  <span>{systemStatus.signalStrength}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span>Database Connection</span>
                </div>
                <div className="flex items-center gap-2">
                  {systemStatus.connectivity ? 
                    <Check className="h-4 w-4 text-green-500" /> : 
                    <XCircle className="h-4 w-4 text-red-500" />
                  }
                  <span>{systemStatus.connectivity ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Last Update</span>
                </div>
                <span className="text-sm">{systemStatus.lastSync}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Hardware Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="text-blue-500" />
              Hardware Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-muted-foreground" />
                  <span>Battery Level</span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className={`h-4 w-4 ${getBatteryColor()}`} />
                  <span>{systemStatus.batteryLevel}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span>Memory Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className={`h-4 w-4 ${getMemoryColor()}`} />
                  <span>{systemStatus.memoryUsage}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span>System Errors</span>
                </div>
                <span>
                  {systemStatus.errors && systemStatus.errors.length > 0 ? 
                    `${systemStatus.errors.length} Errors` : 
                    'No Errors'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="text-blue-500" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Device ID</p>
              <p className="text-sm text-muted-foreground">ESP32-WROOM-DA</p>
            </div>
            <div>
              <p className="text-sm font-medium">Firmware Version</p>
              <p className="text-sm text-muted-foreground">v1.2.5</p>
            </div>
            <div>
              <p className="text-sm font-medium">Uptime</p>
              <p className="text-sm text-muted-foreground">7 days, 14 hours</p>
            </div>
            <div>
              <p className="text-sm font-medium">WiFi Network</p>
              <p className="text-sm text-muted-foreground">Greenhouse_Network</p>
            </div>
            <div>
              <p className="text-sm font-medium">IP Address</p>
              <p className="text-sm text-muted-foreground">192.168.1.105</p>
            </div>
            <div>
              <p className="text-sm font-medium">MAC Address</p>
              <p className="text-sm text-muted-foreground">A4:CF:12:DF:3B:E9</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
