
import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, set } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Activity, 
  Clock, 
  Wifi, 
  RefreshCw,
  Memory,
  InfoIcon,
  Calendar,
  Upload,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SystemInfoProps {
  systemInfo: {
    free_heap: number;
    last_update: string;
    status: string;
    uptime: string;
    wifi_rssi: number;
  };
  database: Database;
  toast: any;
}

export const SystemInfo = ({ systemInfo, database, toast }: SystemInfoProps) => {
  const [loading, setLoading] = useState(false);
  const [lastReboot, setLastReboot] = useState<number | null>(null);

  // Format uptime to human readable
  const formatUptime = (seconds: string) => {
    const uptimeSeconds = parseInt(seconds);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = Math.floor(uptimeSeconds % 60);
    
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Format timestamp to date
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  };

  // Get WiFi signal strength
  const getWifiStrength = (rssi: number) => {
    if (rssi >= -50) return { strength: 'Excellent', color: 'text-emerald-500', percentage: 100 };
    if (rssi >= -60) return { strength: 'Good', color: 'text-green-500', percentage: 80 };
    if (rssi >= -70) return { strength: 'Fair', color: 'text-amber-500', percentage: 60 };
    if (rssi >= -80) return { strength: 'Poor', color: 'text-orange-500', percentage: 40 };
    return { strength: 'Weak', color: 'text-red-500', percentage: 20 };
  };

  // Format memory usage
  const formatMemory = (bytes: number) => {
    const kb = Math.round(bytes / 1024);
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
  };

  // Get last reboot time
  useEffect(() => {
    const lastRebootRef = ref(database, 'system/last_reboot');
    const unsubscribe = onValue(lastRebootRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastReboot(snapshot.val());
      }
    });
    
    return () => unsubscribe();
  }, [database]);

  // Trigger a system reboot
  const handleReboot = async () => {
    try {
      setLoading(true);
      await set(ref(database, 'system/reboot_request'), true);
      toast({
        title: "Reboot requested",
        description: "The system will reboot shortly.",
      });
      
      // Reset the reboot request after a few seconds
      setTimeout(async () => {
        await set(ref(database, 'system/reboot_request'), false);
        setLoading(false);
      }, 5000);
    } catch (error) {
      console.error("Error requesting reboot:", error);
      toast({
        title: "Error",
        description: "Failed to request system reboot.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const wifiStatus = getWifiStrength(systemInfo.wifi_rssi);
  const heapTotal = 520 * 1024; // ESP32 typically has around 520KB of memory
  const memoryUsagePercent = Math.max(0, Math.min(100, 100 - ((systemInfo.free_heap / heapTotal) * 100)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-3xl font-bold mb-2 md:mb-0">System Information</h1>
        <Button 
          onClick={handleReboot} 
          disabled={loading} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Rebooting...' : 'Reboot System'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
            <CardDescription>Current operational status of your greenhouse system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${systemInfo.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="font-medium">Status</span>
              </div>
              <Badge variant={systemInfo.status === 'online' ? 'default' : 'destructive'}>
                {systemInfo.status.toUpperCase()}
              </Badge>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Uptime</span>
                </div>
                <span>{formatUptime(systemInfo.uptime)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Last Update</span>
                </div>
                <span>{formatTimestamp(systemInfo.last_update)}</span>
              </div>
              {lastReboot && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-orange-500" />
                    <span>Last Reboot</span>
                  </div>
                  <span>{formatTimestamp(lastReboot.toString())}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Network Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Network Status
            </CardTitle>
            <CardDescription>WiFi connection and signal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">WiFi Signal Strength</span>
                <span className={wifiStatus.color}>{wifiStatus.strength}</span>
              </div>
              <Progress value={wifiStatus.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Weak</span>
                <span>Excellent</span>
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-blue-500" />
                  <span>Signal</span>
                </div>
                <span>{systemInfo.wifi_rssi} dBm</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-500" />
                  <span>Upload</span>
                </div>
                <span>--</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-indigo-500" />
                  <span>Download</span>
                </div>
                <span>--</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Memory Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Memory className="h-5 w-5 text-primary" />
              Memory Usage
            </CardTitle>
            <CardDescription>System memory allocation and usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Free Memory</span>
                <span className={memoryUsagePercent > 80 ? 'text-red-500' : 'text-emerald-500'}>
                  {formatMemory(systemInfo.free_heap)}
                </span>
              </div>
              <Progress value={memoryUsagePercent} className={`h-2 ${memoryUsagePercent > 80 ? 'bg-red-500' : ''}`} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-purple-500" />
                  <span>Total Memory</span>
                </div>
                <span>{formatMemory(heapTotal)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${memoryUsagePercent > 80 ? 'text-red-500' : 'text-amber-500'}`} />
                  <span>Memory Usage</span>
                </div>
                <Badge variant={memoryUsagePercent > 80 ? 'destructive' : memoryUsagePercent > 50 ? 'secondary' : 'default'}>
                  {memoryUsagePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* System Information Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <InfoIcon className="h-5 w-5 text-primary" />
              Device Information
            </CardTitle>
            <CardDescription>Hardware and firmware details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Device</div>
                  <div className="font-medium">ESP32</div>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Firmware</div>
                  <div className="font-medium">1.0.0</div>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Processor</div>
                  <div className="font-medium">Dual Core</div>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Flash Size</div>
                  <div className="font-medium">4 MB</div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" className="w-full">
              Check for Updates
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
