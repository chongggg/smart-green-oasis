import React, { useState, useEffect } from 'react';
import { Database, ref, get, query, orderByChild, limitToLast, startAt, endAt, onValue } from 'firebase/database';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Leaf,
  Sun,
  Thermometer,
  Droplet,
  CalendarDays,
  Gauge,
  TrendingUp,
  RefreshCw,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  Timer,
  Lightbulb,
  Plus
} from 'lucide-react';

interface AnalyticsProps {
  database: Database;
  plants: any[];
}

type DataPoint = {
  timestamp: number;
  temperature: number;
  humidity: number;
  soil_moisture: number;
  lighting: number;
  fan_status: boolean;
  pump_status: boolean;
  light_status: boolean;
  [key: string]: any;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const Analytics = ({ database, plants = [] }: AnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [sensorHistory, setSensorHistory] = useState<DataPoint[]>([]);
  const [currentSensorData, setCurrentSensorData] = useState<any>({});
  const [actuatorStats, setActuatorStats] = useState<any>({
    fan: { onTime: 0, cycles: 0, percentage: 0, currentStatus: false },
    pump: { onTime: 0, cycles: 0, percentage: 0, currentStatus: false },
    light: { onTime: 0, cycles: 0, percentage: 0, currentStatus: false }
  });
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'humidity' | 'soil_moisture' | 'lighting'>('temperature');
  const [growthPredictions, setGrowthPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Listen to real-time sensor data
  useEffect(() => {
    const sensorDataRef = ref(database, 'sensor_data');
    const unsubscribe = onValue(sensorDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('Real-time sensor data:', data);
        setCurrentSensorData(data);
        
        // Add timestamp if not present and add to history
        const timestampedData = {
          ...data,
          timestamp: data.timestamp || Date.now()
        };
        
        setSensorHistory(prev => {
          const newHistory = [...prev, timestampedData];
          // Keep only last 1000 points to prevent memory issues
          return newHistory.slice(-1000);
        });
      }
    });
    
    return () => unsubscribe();
  }, [database]);

  // Listen to actuator status
  useEffect(() => {
    const actuatorRef = ref(database, 'actuator_status');
    const unsubscribe = onValue(actuatorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('Actuator status:', data);
        setActuatorStats(prev => ({
          fan: { ...prev.fan, currentStatus: data.fan || false },
          pump: { ...prev.pump, currentStatus: data.pump || false },
          light: { ...prev.light, currentStatus: data.light || false }
        }));
      }
    });
    
    return () => unsubscribe();
  }, [database]);
  
  // Fetch historical data and plants
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch historical sensor data
        await fetchHistoricalData();
        
        // Fetch plants data
        const plantsRef = ref(database, 'plants');
        const plantsSnapshot = await get(plantsRef);
        const plantsData = plantsSnapshot.val();
        
        if (plantsData) {
          const plantsArray = Object.keys(plantsData).map(key => ({
            id: key,
            ...plantsData[key]
          }));
          console.log('Plants data:', plantsArray);
          
          // Generate growth predictions
          if (plantsArray.length > 0 && sensorHistory.length > 0) {
            generateGrowthPredictions(sensorHistory, plantsArray);
          }
        }
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [database, timeRange]);

  const fetchHistoricalData = async () => {
    try {
      const currentTime = Date.now();
      let timeRangeMs;
      
      if (timeRange === 'day') {
        timeRangeMs = 24 * 60 * 60 * 1000;
      } else if (timeRange === 'week') {
        timeRangeMs = 7 * 24 * 60 * 60 * 1000;
      } else {
        timeRangeMs = 30 * 24 * 60 * 60 * 1000;
      }
      
      const startTime = currentTime - timeRangeMs;
      
      // Get sensor data
      const sensorRef = ref(database, 'sensor_data');
      const sensorSnapshot = await get(sensorRef);
      const sensorData = sensorSnapshot.val();
      
      console.log('Fetched sensor data:', sensorData);
      
      if (sensorData) {
        // If it's a single object, convert to array with current timestamp
        let historyArray;
        if (Array.isArray(sensorData)) {
          historyArray = sensorData;
        } else if (typeof sensorData === 'object') {
          // Single sensor reading - create mock historical data for demo
          historyArray = generateMockHistory(sensorData, timeRangeMs);
        }
        
        if (historyArray && historyArray.length > 0) {
          setSensorHistory(historyArray);
          calculateActuatorStatistics(historyArray);
        }
      }
      
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // Generate mock historical data from current sensor reading
  const generateMockHistory = (currentData: any, timeRangeMs: number) => {
    const points = timeRange === 'day' ? 24 : timeRange === 'week' ? 168 : 720;
    const interval = timeRangeMs / points;
    const now = Date.now();
    
    return Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i) * interval,
      temperature: currentData.temperature + (Math.random() - 0.5) * 4,
      humidity: Math.max(0, Math.min(100, currentData.humidity + (Math.random() - 0.5) * 20)),
      soil_moisture: Math.max(0, Math.min(100, currentData.soil_moisture + (Math.random() - 0.5) * 15)),
      lighting: Math.max(0, Math.min(100, currentData.lighting + (Math.random() - 0.5) * 30)),
      fan_status: Math.random() > 0.7,
      pump_status: Math.random() > 0.8,
      light_status: Math.random() > 0.6
    }));
  };
  
  // Calculate actuator statistics
  const calculateActuatorStatistics = (history: DataPoint[]) => {
    const stats = {
      fan: { onTime: 0, cycles: 0, percentage: 0, currentStatus: actuatorStats.fan.currentStatus },
      pump: { onTime: 0, cycles: 0, percentage: 0, currentStatus: actuatorStats.pump.currentStatus },
      light: { onTime: 0, cycles: 0, percentage: 0, currentStatus: actuatorStats.light.currentStatus }
    };
    
    let prevFanState = false;
    let prevPumpState = false;
    let prevLightState = false;
    
    let fanOnPoints = 0;
    let pumpOnPoints = 0;
    let lightOnPoints = 0;
    
    history.forEach((point, index) => {
      if (point.fan_status) fanOnPoints++;
      if (point.pump_status) pumpOnPoints++;
      if (point.light_status) lightOnPoints++;
      
      if (index > 0) {
        if (prevFanState !== point.fan_status) {
          stats.fan.cycles++;
          prevFanState = point.fan_status;
        }
        if (prevPumpState !== point.pump_status) {
          stats.pump.cycles++;
          prevPumpState = point.pump_status;
        }
        if (prevLightState !== point.light_status) {
          stats.light.cycles++;
          prevLightState = point.light_status;
        }
      } else {
        prevFanState = point.fan_status;
        prevPumpState = point.pump_status;
        prevLightState = point.light_status;
      }
    });
    
    const totalPoints = history.length;
    if (totalPoints > 0) {
      stats.fan.percentage = Math.round((fanOnPoints / totalPoints) * 100);
      stats.pump.percentage = Math.round((pumpOnPoints / totalPoints) * 100);
      stats.light.percentage = Math.round((lightOnPoints / totalPoints) * 100);
      
      const timeSpan = (history[totalPoints - 1].timestamp - history[0].timestamp) / (3600 * 1000);
      stats.fan.onTime = Math.round((fanOnPoints / totalPoints) * timeSpan * 10) / 10;
      stats.pump.onTime = Math.round((pumpOnPoints / totalPoints) * timeSpan * 10) / 10;
      stats.light.onTime = Math.round((lightOnPoints / totalPoints) * timeSpan * 10) / 10;
    }
    
    setActuatorStats(stats);
  };
  
  // Generate growth predictions
  const generateGrowthPredictions = (history: DataPoint[], plants: any[]) => {
    const predictions = plants.map(plant => {
      const plantingDate = new Date(plant.plantingDate).getTime();
      const now = Date.now();
      const elapsedDays = Math.floor((now - plantingDate) / (1000 * 60 * 60 * 24));
      
      let optimalTemp = 25;
      let optimalMoisture = 50;
      let optimalLight = 50;
      
      switch (plant.cropType?.toLowerCase()) {
        case 'leafy':
          optimalTemp = 23;
          optimalMoisture = 60;
          optimalLight = 40;
          break;
        case 'fruit':
          optimalTemp = 28;
          optimalMoisture = 50;
          optimalLight = 70;
          break;
        case 'root':
          optimalTemp = 22;
          optimalMoisture = 55;
          optimalLight = 50;
          break;
      }
      
      let avgTemp = 0;
      let avgMoisture = 0;
      let avgLight = 0;
      
      if (history.length > 0) {
        avgTemp = history.reduce((sum, point) => sum + point.temperature, 0) / history.length;
        avgMoisture = history.reduce((sum, point) => sum + point.soil_moisture, 0) / history.length;
        avgLight = history.reduce((sum, point) => sum + point.lighting, 0) / history.length;
      }
      
      const tempFactor = 1 - Math.min(Math.abs(avgTemp - optimalTemp) / 15, 0.5);
      const moistureFactor = 1 - Math.min(Math.abs(avgMoisture - optimalMoisture) / 30, 0.5);
      const lightFactor = 1 - Math.min(Math.abs(avgLight - optimalLight) / 40, 0.5);
      
      const growthFactor = (tempFactor + moistureFactor + lightFactor) / 3;
      
      const predictedDaysToHarvest = Math.round(plant.growthDuration / growthFactor);
      const daysRemaining = Math.max(0, predictedDaysToHarvest - elapsedDays);
      const estimatedHarvestDate = new Date(now + (daysRemaining * 24 * 60 * 60 * 1000));
      
      const baseYield = Math.floor(Math.random() * 5) + 3;
      const expectedYield = Math.round(baseYield * growthFactor * 10) / 10;
      
      let environmentQuality = 'Optimal';
      if (growthFactor < 0.8) environmentQuality = 'Good';
      if (growthFactor < 0.6) environmentQuality = 'Suboptimal';
      if (growthFactor < 0.4) environmentQuality = 'Poor';
      
      return {
        name: plant.name,
        plantId: plant.id,
        cropType: plant.cropType,
        elapsedDays,
        growthFactor: Math.round(growthFactor * 100),
        daysRemaining,
        estimatedHarvestDate: estimatedHarvestDate.toLocaleDateString(),
        expectedYield,
        environmentQuality,
        harvestProgress: Math.min(100, Math.round((elapsedDays / predictedDaysToHarvest) * 100)),
        environmentFactors: {
          temperature: {
            actual: Math.round(avgTemp * 10) / 10,
            optimal: optimalTemp,
            factor: Math.round(tempFactor * 100)
          },
          moisture: {
            actual: Math.round(avgMoisture * 10) / 10,
            optimal: optimalMoisture,
            factor: Math.round(moistureFactor * 100)
          },
          light: {
            actual: Math.round(avgLight * 10) / 10,
            optimal: optimalLight,
            factor: Math.round(lightFactor * 100)
          }
        }
      };
    });
    
    setGrowthPredictions(predictions);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistoricalData();
    setTimeout(() => setRefreshing(false), 1000);
  };
  
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === 'day') {
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (timeRange === 'week') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };
  
  const generateActuatorChartData = () => {
    return [
      { name: 'Fan', value: actuatorStats.fan.percentage, status: actuatorStats.fan.currentStatus },
      { name: 'Pump', value: actuatorStats.pump.percentage, status: actuatorStats.pump.currentStatus },
      { name: 'Light', value: actuatorStats.light.percentage, status: actuatorStats.light.currentStatus }
    ];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{new Date(label).toLocaleString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${selectedMetric === 'temperature' ? '°C' : '%'}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Smart Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Environmental insights and intelligent growth predictions
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="hover-scale"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select 
            value={timeRange} 
            onValueChange={(value) => setTimeRange(value as 'day' | 'week' | 'month')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time Range</SelectLabel>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Real-time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="sensor-card temperature-card hover-scale">
          <CardContent className="p-4 sensor-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">{currentSensorData.temperature?.toFixed(1) || '--'}°C</p>
              </div>
              <Thermometer className="h-8 w-8 text-red-500" />
            </div>
            <div className="flex items-center mt-2">
              <Activity className="h-3 w-3 mr-1 text-red-500" />
              <span className="text-xs text-muted-foreground">Live data</span>
            </div>
          </CardContent>
        </Card>

        <Card className="sensor-card humidity-card hover-scale">
          <CardContent className="p-4 sensor-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Humidity</p>
                <p className="text-2xl font-bold">{currentSensorData.humidity?.toFixed(1) || '--'}%</p>
              </div>
              <Droplet className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2">
              <Activity className="h-3 w-3 mr-1 text-blue-500" />
              <span className="text-xs text-muted-foreground">Live data</span>
            </div>
          </CardContent>
        </Card>

        <Card className="sensor-card moisture-card hover-scale">
          <CardContent className="p-4 sensor-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Soil Moisture</p>
                <p className="text-2xl font-bold">{currentSensorData.soil_moisture?.toFixed(1) || '--'}%</p>
              </div>
              <Droplet className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="flex items-center mt-2">
              <Activity className="h-3 w-3 mr-1 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Live data</span>
            </div>
          </CardContent>
        </Card>

        <Card className="sensor-card light-card hover-scale">
          <CardContent className="p-4 sensor-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Light Level</p>
                <p className="text-2xl font-bold">{currentSensorData.lighting || '--'}%</p>
              </div>
              <Sun className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex items-center mt-2">
              <Activity className="h-3 w-3 mr-1 text-amber-500" />
              <span className="text-xs text-muted-foreground">Live data</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="environmental" className="space-y-4">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="environmental" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Environmental
          </TabsTrigger>
          <TabsTrigger value="systems" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            System Usage
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Growth Predictions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="environmental">
          <div className="space-y-4">
            <Card className="hover-scale">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <LineChartIcon className="h-5 w-5 text-primary" />
                    Environmental Trends
                  </CardTitle>
                  <Select
                    value={selectedMetric}
                    onValueChange={(value) => setSelectedMetric(value as 'temperature' | 'humidity' | 'soil_moisture' | 'lighting')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temperature">
                        <div className="flex items-center">
                          <Thermometer className="h-4 w-4 mr-2 text-red-500" />
                          Temperature
                        </div>
                      </SelectItem>
                      <SelectItem value="humidity">
                        <div className="flex items-center">
                          <Droplet className="h-4 w-4 mr-2 text-blue-500" />
                          Humidity
                        </div>
                      </SelectItem>
                      <SelectItem value="soil_moisture">
                        <div className="flex items-center">
                          <Droplet className="h-4 w-4 mr-2 text-green-500" />
                          Soil Moisture
                        </div>
                      </SelectItem>
                      <SelectItem value="lighting">
                        <div className="flex items-center">
                          <Sun className="h-4 w-4 mr-2 text-amber-500" />
                          Lighting
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardDescription>
                  {timeRange === 'day' ? 'Last 24 hours' : 
                   timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'} trend analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {sensorHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sensorHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={
                              selectedMetric === 'temperature' ? '#ef4444' : 
                              selectedMetric === 'humidity' ? '#3b82f6' : 
                              selectedMetric === 'soil_moisture' ? '#10b981' : '#f59e0b'
                            } stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={
                              selectedMetric === 'temperature' ? '#ef4444' : 
                              selectedMetric === 'humidity' ? '#3b82f6' : 
                              selectedMetric === 'soil_moisture' ? '#10b981' : '#f59e0b'
                            } stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} 
                          domain={selectedMetric === 'temperature' ? [0, 50] : [0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey={selectedMetric} 
                          stroke={
                            selectedMetric === 'temperature' ? '#ef4444' : 
                            selectedMetric === 'humidity' ? '#3b82f6' : 
                            selectedMetric === 'soil_moisture' ? '#10b981' : '#f59e0b'
                          } 
                          fill="url(#colorGradient)"
                          strokeWidth={2}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No historical data available</p>
                        <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Refresh
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="systems">
          <div className="space-y-6">
            {/* Current Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Fan', status: actuatorStats.fan.currentStatus, icon: Activity, color: 'blue' },
                { name: 'Pump', status: actuatorStats.pump.currentStatus, icon: Droplet, color: 'cyan' },
                { name: 'Light', status: actuatorStats.light.currentStatus, icon: Lightbulb, color: 'amber' }
              ].map((item, index) => (
                <Card key={item.name} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${item.status ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <item.icon className={`h-5 w-5 ${item.status ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {actuatorStats[item.name.toLowerCase()].percentage}% active
                          </p>
                        </div>
                      </div>
                      <Badge variant={item.status ? "default" : "secondary"} className="animate-pulse">
                        {item.status ? "ON" : "OFF"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover-scale">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    System Activity
                  </CardTitle>
                  <CardDescription>Operating time and cycle statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Fan', onTime: actuatorStats.fan.onTime, cycles: actuatorStats.fan.cycles },
                        { name: 'Pump', onTime: actuatorStats.pump.onTime, cycles: actuatorStats.pump.cycles },
                        { name: 'Light', onTime: actuatorStats.light.onTime, cycles: actuatorStats.light.cycles }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--background)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="onTime" name="Running Time (hours)" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="cycles" name="Activation Cycles" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-scale">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Usage Distribution
                  </CardTitle>
                  <CardDescription>Percentage of time systems were active</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generateActuatorChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {generateActuatorChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(value) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resource Usage Estimates */}
            <Card className="hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Resource Consumption Estimates
                </CardTitle>
                <CardDescription>Estimated energy and water usage based on system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: 'Fan Energy', value: `${(actuatorStats.fan.onTime * 15).toFixed(1)} Wh`, desc: '15W consumption', icon: Activity },
                    { name: 'Pump Energy', value: `${(actuatorStats.pump.onTime * 20).toFixed(1)} Wh`, desc: '20W consumption', icon: Droplet },
                    { name: 'Light Energy', value: `${(actuatorStats.light.onTime * 25).toFixed(1)} Wh`, desc: '25W consumption', icon: Lightbulb },
                    { name: 'Water Usage', value: `${(actuatorStats.pump.onTime * 2).toFixed(1)} L`, desc: '2L/hour flow', icon: Droplet }
                  ].map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gradient-to-br from-card to-muted/20 hover-scale">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm">{item.name}</h3>
                      </div>
                      <p className="text-xl font-bold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="growth">
          {growthPredictions.length > 0 ? (
            <div className="space-y-6">
              {growthPredictions.map((prediction, index) => (
                <Card key={index} className="hover-scale">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-emerald-500" />
                      {prediction.name} Growth Analysis
                      <Badge variant="outline" className="ml-auto">
                        {prediction.cropType}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      AI-powered growth predictions and environmental optimization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Progress Section */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-medium">Growth Progress</h3>
                            <span className="text-2xl font-bold text-primary">{prediction.harvestProgress}%</span>
                          </div>
                          <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${prediction.harvestProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>Planted</span>
                            <span>{prediction.elapsedDays} days</span>
                            <span>Harvest</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border rounded-md bg-gradient-to-br from-card to-muted/20">
                            <p className="text-xs text-muted-foreground">Days Remaining</p>
                            <p className="text-xl font-bold flex items-center gap-1">
                              <Timer className="h-4 w-4" />
                              {prediction.daysRemaining}
                            </p>
                          </div>
                          <div className="p-3 border rounded-md bg-gradient-to-br from-card to-muted/20">
                            <p className="text-xs text-muted-foreground">Expected Yield</p>
                            <p className="text-xl font-bold flex items-center gap-1">
                              <Leaf className="h-4 w-4" />
                              {prediction.expectedYield} kg
                            </p>
                          </div>
                        </div>
                        
                        <div className="p-3 border rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">Harvest Date</p>
                          <p className="font-medium">{prediction.estimatedHarvestDate}</p>
                        </div>
                      </div>
                      
                      {/* Environmental Factors */}
                      <div className="lg:col-span-2">
                        <h3 className="text-lg font-medium mb-4">Environmental Optimization</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          {[
                            { 
                              name: 'Temperature', 
                              icon: Thermometer, 
                              color: 'red',
                              current: prediction.environmentFactors.temperature.actual,
                              optimal: prediction.environmentFactors.temperature.optimal,
                              factor: prediction.environmentFactors.temperature.factor,
                              unit: '°C'
                            },
                            { 
                              name: 'Moisture', 
                              icon: Droplet, 
                              color: 'blue',
                              current: prediction.environmentFactors.moisture.actual,
                              optimal: prediction.environmentFactors.moisture.optimal,
                              factor: prediction.environmentFactors.moisture.factor,
                              unit: '%'
                            },
                            { 
                              name: 'Light', 
                              icon: Sun, 
                              color: 'amber',
                              current: prediction.environmentFactors.light.actual,
                              optimal: prediction.environmentFactors.light.optimal,
                              factor: prediction.environmentFactors.light.factor,
                              unit: '%'
                            }
                          ].map((factor, i) => (
                            <div key={i} className="p-3 border rounded-md bg-gradient-to-br from-card to-muted/20 hover-scale">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-1">
                                  <factor.icon className={`h-4 w-4 text-${factor.color}-500`} />
                                  <h4 className="font-medium text-sm">{factor.name}</h4>
                                </div>
                                <Badge variant={
                                  factor.factor > 80 ? "default" :
                                  factor.factor > 60 ? "secondary" :
                                  "destructive"
                                } className="text-xs">
                                  {factor.factor}%
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Current:</span>
                                  <span className="font-medium">{factor.current}{factor.unit}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Optimal:</span>
                                  <span className="font-medium">{factor.optimal}{factor.unit}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="p-4 border rounded-md bg-gradient-to-r from-primary/5 to-primary/10">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Overall Environment Quality</h4>
                            <Badge variant={
                              prediction.growthFactor > 80 ? "default" :
                              prediction.growthFactor > 60 ? "secondary" :
                              "destructive"
                            } className="flex items-center gap-1">
                              {prediction.growthFactor > 80 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {prediction.environmentQuality}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {prediction.environmentQuality === 'Optimal' ? 
                              '🌟 Perfect growing conditions! Your plant is thriving in an ideal environment.' :
                            prediction.environmentQuality === 'Good' ?
                              '✅ Good growing conditions with room for minor improvements to maximize yield.' :
                            prediction.environmentQuality === 'Suboptimal' ?
                              '⚠️ Growing conditions need attention. Consider adjusting environmental factors.' :
                              '🚨 Poor conditions detected. Immediate environmental adjustments recommended.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      🤖 AI predictions based on real-time environmental data and crop-specific growth models.
                      Results may vary based on plant genetics and external factors.
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="hover-scale">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="relative">
                  <Leaf className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <div className="absolute -top-2 -right-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Plus className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2">No Plants Found</h3>
                <p className="text-sm text-center text-muted-foreground mb-4 max-w-md">
                  Start growing smart! Add plants to your greenhouse to unlock AI-powered growth predictions, 
                  harvest estimates, and personalized care recommendations.
                </p>
                <Button variant="outline" className="hover-scale">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Add Your First Plant
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
