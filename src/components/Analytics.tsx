import React, { useState, useEffect } from 'react';
import { Database, ref, get, query, orderByChild, limitToLast, startAt, endAt } from 'firebase/database';
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
  Cell
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
  LineChart,
  PieChart as PieChartIcon,
  Leaf,
  Sun,
  Thermometer,
  Droplet,
  CalendarDays,
  Gauge,
  TrendingUp
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
  [key: string]: any;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Analytics = ({ database, plants = [] }: AnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [sensorHistory, setSensorHistory] = useState<DataPoint[]>([]);
  const [actuatorStats, setActuatorStats] = useState<any>({
    fan: { onTime: 0, cycles: 0, percentage: 0 },
    pump: { onTime: 0, cycles: 0, percentage: 0 },
    light: { onTime: 0, cycles: 0, percentage: 0 }
  });
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'humidity' | 'soil_moisture' | 'lighting'>('temperature');
  const [growthPredictions, setGrowthPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch historical sensor data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const currentTime = Date.now();
        // Calculate time range in milliseconds
        let timeRangeMs;
        if (timeRange === 'day') {
          timeRangeMs = 24 * 60 * 60 * 1000; // 24 hours
        } else if (timeRange === 'week') {
          timeRangeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        } else {
          timeRangeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        
        const startTime = currentTime - timeRangeMs;
        
        // Get sensor history from Firebase
        const historyRef = ref(database, 'sensor_data');
        const historyQuery = query(
          historyRef,
          orderByChild('timestamp'),
          startAt(startTime),
          limitToLast(500) // Limit to prevent too much data
        );
        
        const snapshot = await get(historyQuery);
        const data = snapshot.val();
        
        if (data) {
          const historyArray = Object.values(data) as DataPoint[];
          // Sort by timestamp
          historyArray.sort((a, b) => a.timestamp - b.timestamp);
          setSensorHistory(historyArray);
          
          // Calculate actuator statistics
          calculateActuatorStatistics(historyArray);
          
          // Generate growth predictions based on environmental data
          if (plants.length > 0) {
            generateGrowthPredictions(historyArray, plants);
          }
        } else {
          setSensorHistory([]);
        }
        
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [database, timeRange, plants]);
  
  // Calculate actuator statistics
  const calculateActuatorStatistics = (history: DataPoint[]) => {
    const stats = {
      fan: { onTime: 0, cycles: 0, percentage: 0 },
      pump: { onTime: 0, cycles: 0, percentage: 0 },
      light: { onTime: 0, cycles: 0, percentage: 0 }
    };
    
    let prevFanState = false;
    let prevPumpState = false;
    let prevLightState = false;
    
    let fanOnPoints = 0;
    let pumpOnPoints = 0;
    let lightOnPoints = 0;
    
    history.forEach((point, index) => {
      // Count on data points
      if (point.fan_status) {
        fanOnPoints++;
      }
      if (point.pump_status) {
        pumpOnPoints++;
      }
      if (point.light_status) {
        lightOnPoints++;
      }
      
      // Count cycles (state changes)
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
    
    // Calculate percentages
    const totalPoints = history.length;
    if (totalPoints > 0) {
      stats.fan.percentage = Math.round((fanOnPoints / totalPoints) * 100);
      stats.pump.percentage = Math.round((pumpOnPoints / totalPoints) * 100);
      stats.light.percentage = Math.round((lightOnPoints / totalPoints) * 100);
      
      // Estimate on time in hours based on data point frequency
      stats.fan.onTime = Math.round((fanOnPoints / totalPoints) * (history[totalPoints - 1].timestamp - history[0].timestamp) / (3600 * 1000) * 10) / 10;
      stats.pump.onTime = Math.round((pumpOnPoints / totalPoints) * (history[totalPoints - 1].timestamp - history[0].timestamp) / (3600 * 1000) * 10) / 10;
      stats.light.onTime = Math.round((lightOnPoints / totalPoints) * (history[totalPoints - 1].timestamp - history[0].timestamp) / (3600 * 1000) * 10) / 10;
    }
    
    setActuatorStats(stats);
  };
  
  // Generate growth predictions based on environmental data
  const generateGrowthPredictions = (history: DataPoint[], plants: any[]) => {
    const predictions = plants.map(plant => {
      const plantingDate = new Date(plant.plantingDate).getTime();
      const now = Date.now();
      const elapsedDays = Math.floor((now - plantingDate) / (1000 * 60 * 60 * 24));
      
      // Calculate optimal growth factors based on crop type
      let optimalTemp = 25;
      let optimalMoisture = 50;
      let optimalLight = 50;
      
      switch (plant.cropType) {
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
      
      // Calculate average environmental factors from history
      let avgTemp = 0;
      let avgMoisture = 0;
      let avgLight = 0;
      
      if (history.length > 0) {
        avgTemp = history.reduce((sum, point) => sum + point.temperature, 0) / history.length;
        avgMoisture = history.reduce((sum, point) => sum + point.soil_moisture, 0) / history.length;
        avgLight = history.reduce((sum, point) => sum + point.lighting, 0) / history.length;
      }
      
      // Calculate growth factor based on environmental conditions
      // This is a simplified model for demonstration
      const tempFactor = 1 - Math.min(Math.abs(avgTemp - optimalTemp) / 15, 0.5);
      const moistureFactor = 1 - Math.min(Math.abs(avgMoisture - optimalMoisture) / 30, 0.5);
      const lightFactor = 1 - Math.min(Math.abs(avgLight - optimalLight) / 40, 0.5);
      
      const growthFactor = (tempFactor + moistureFactor + lightFactor) / 3;
      
      // Predicted days to harvest based on growth factor
      // If growth conditions are suboptimal, the plant will take longer to mature
      const predictedDaysToHarvest = Math.round(plant.growthDuration / growthFactor);
      const daysRemaining = Math.max(0, predictedDaysToHarvest - elapsedDays);
      const estimatedHarvestDate = new Date(now + (daysRemaining * 24 * 60 * 60 * 1000));
      
      // Calculate expected yield (simplified model)
      // Base yield adjusted by growth factor
      const baseYield = Math.floor(Math.random() * 5) + 3; // Random base yield between 3-7
      const expectedYield = Math.round(baseYield * growthFactor * 10) / 10;
      
      // Environment quality assessment
      let environmentQuality = 'Optimal';
      if (growthFactor < 0.8) {
        environmentQuality = 'Good';
      }
      if (growthFactor < 0.6) {
        environmentQuality = 'Suboptimal';
      }
      if (growthFactor < 0.4) {
        environmentQuality = 'Poor';
      }
      
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
  
  // Format timestamp for chart
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
  
  // Generate actuator stats chart data
  const generateActuatorChartData = () => {
    return [
      { name: 'Fan', value: actuatorStats.fan.percentage },
      { name: 'Pump', value: actuatorStats.pump.percentage },
      { name: 'Light', value: actuatorStats.light.percentage }
    ];
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Environmental data analysis and growth predictions
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 md:mt-0">
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
      
      <Tabs defaultValue="environmental">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="environmental">
            <LineChart className="h-4 w-4 mr-2" />
            Environmental
          </TabsTrigger>
          <TabsTrigger value="systems">
            <BarChart3 className="h-4 w-4 mr-2" />
            System Usage
          </TabsTrigger>
          <TabsTrigger value="growth">
            <TrendingUp className="h-4 w-4 mr-2" />
            Growth Predictions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="environmental">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="col-span-1 md:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-primary" />
                    Environmental Data Trends
                  </CardTitle>
                  <Select
                    value={selectedMetric}
                    onValueChange={(value) => setSelectedMetric(value as 'temperature' | 'humidity' | 'soil_moisture' | 'lighting')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select metric" />
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
                   timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'} of environmental data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {sensorHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={sensorHistory}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} 
                          domain={
                            selectedMetric === 'temperature' ? [0, 50] :
                            [0, 100]
                          }
                        />
                        <Tooltip 
                          formatter={(value: any) => {
                            return [`${value}${selectedMetric === 'temperature' ? '°C' : '%'}`, 
                              selectedMetric === 'temperature' ? 'Temperature' : 
                              selectedMetric === 'humidity' ? 'Humidity' : 
                              selectedMetric === 'soil_moisture' ? 'Soil Moisture' : 
                              'Lighting'
                            ];
                          }}
                          labelFormatter={(timestamp) => {
                            return new Date(timestamp).toLocaleString();
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={selectedMetric} 
                          name={
                            selectedMetric === 'temperature' ? 'Temperature' : 
                            selectedMetric === 'humidity' ? 'Humidity' : 
                            selectedMetric === 'soil_moisture' ? 'Soil Moisture' : 
                            'Lighting'
                          }
                          stroke={
                            selectedMetric === 'temperature' ? '#ef4444' : 
                            selectedMetric === 'humidity' ? '#3b82f6' : 
                            selectedMetric === 'soil_moisture' ? '#10b981' : 
                            '#f59e0b'
                          } 
                          fill={
                            selectedMetric === 'temperature' ? 'rgba(239, 68, 68, 0.2)' : 
                            selectedMetric === 'humidity' ? 'rgba(59, 130, 246, 0.2)' : 
                            selectedMetric === 'soil_moisture' ? 'rgba(16, 185, 129, 0.2)' : 
                            'rgba(245, 158, 11, 0.2)'
                          }
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No historical data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Mini stat cards for average values */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Thermometer className="h-4 w-4 mr-2 text-red-500" />
                  Average Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sensorHistory.length > 0
                    ? `${(sensorHistory.reduce((sum, point) => sum + point.temperature, 0) / sensorHistory.length).toFixed(1)}°C`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  During selected period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Droplet className="h-4 w-4 mr-2 text-blue-500" />
                  Average Humidity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sensorHistory.length > 0
                    ? `${(sensorHistory.reduce((sum, point) => sum + point.humidity, 0) / sensorHistory.length).toFixed(1)}%`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  During selected period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Sun className="h-4 w-4 mr-2 text-amber-500" />
                  Average Light Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sensorHistory.length > 0
                    ? `${(sensorHistory.reduce((sum, point) => sum + point.lighting, 0) / sensorHistory.length).toFixed(1)}%`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  During selected period
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="systems">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  System Operations
                </CardTitle>
                <CardDescription>
                  Usage statistics of automated systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Fan', onTime: actuatorStats.fan.onTime, cycles: actuatorStats.fan.cycles },
                        { name: 'Pump', onTime: actuatorStats.pump.onTime, cycles: actuatorStats.pump.cycles },
                        { name: 'Light', onTime: actuatorStats.light.onTime, cycles: actuatorStats.light.cycles }
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="onTime" name="Running Time (hours)" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="cycles" name="Activation Cycles" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  System Activity
                </CardTitle>
                <CardDescription>
                  Percentage of time systems were active
                </CardDescription>
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
          
          {/* Daily energy estimate */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Estimated Resource Usage 
              </CardTitle>
              <CardDescription>
                Approximate energy and water consumption
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Energy Usage (Fan)</h3>
                  <p className="text-2xl font-bold">{(actuatorStats.fan.onTime * 15).toFixed(1)} Wh</p>
                  <p className="text-xs text-muted-foreground">Based on 15W consumption</p>
                </div>
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Energy Usage (Pump)</h3>
                  <p className="text-2xl font-bold">{(actuatorStats.pump.onTime * 20).toFixed(1)} Wh</p>
                  <p className="text-xs text-muted-foreground">Based on 20W consumption</p>
                </div>
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Energy Usage (Light)</h3>
                  <p className="text-2xl font-bold">{(actuatorStats.light.onTime * 25).toFixed(1)} Wh</p>
                  <p className="text-xs text-muted-foreground">Based on 25W consumption</p>
                </div>
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Water Usage</h3>
                  <p className="text-2xl font-bold">{(actuatorStats.pump.onTime * 2).toFixed(1)} L</p>
                  <p className="text-xs text-muted-foreground">Based on 2L/hour flow</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="growth">
          {growthPredictions.length > 0 ? (
            <div className="space-y-6">
              {growthPredictions.map((prediction, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-emerald-500" />
                      {prediction.name} Growth Analysis
                    </CardTitle>
                    <CardDescription>
                      {prediction.cropType.charAt(0).toUpperCase() + prediction.cropType.slice(1)} crop growth predictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">Growth Progress</h3>
                          <div className="h-2 w-full bg-gray-200 rounded-full mt-2">
                            <div 
                              className="h-2 bg-emerald-500 rounded-full" 
                              style={{ width: `${prediction.harvestProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs">
                            <span>Planted ({prediction.elapsedDays} days ago)</span>
                            <span>{prediction.harvestProgress}%</span>
                            <span>Harvest</span>
                          </div>
                        </div>
                        
                        <div className="p-3 border rounded-md">
                          <h4 className="font-medium mb-2">Harvest Prediction</h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Estimated Days Remaining:</span>
                            <span className="font-medium">{prediction.daysRemaining} days</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Estimated Harvest Date:</span>
                            <span className="font-medium">{prediction.estimatedHarvestDate}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Expected Yield:</span>
                            <span className="font-medium">{prediction.expectedYield} kg</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <h3 className="text-lg font-medium mb-4">Environmental Factors</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1">
                                <Thermometer className="h-4 w-4 text-red-500" />
                                <h4 className="font-medium">Temperature</h4>
                              </div>
                              <Badge variant={
                                prediction.environmentFactors.temperature.factor > 80 ? "default" :
                                prediction.environmentFactors.temperature.factor > 60 ? "secondary" :
                                "destructive"
                              }>
                                {prediction.environmentFactors.temperature.factor}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span>{prediction.environmentFactors.temperature.actual}°C</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Optimal:</span>
                              <span>{prediction.environmentFactors.temperature.optimal}°C</span>
                            </div>
                          </div>
                          
                          <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1">
                                <Droplet className="h-4 w-4 text-blue-500" />
                                <h4 className="font-medium">Moisture</h4>
                              </div>
                              <Badge variant={
                                prediction.environmentFactors.moisture.factor > 80 ? "default" :
                                prediction.environmentFactors.moisture.factor > 60 ? "secondary" :
                                "destructive"
                              }>
                                {prediction.environmentFactors.moisture.factor}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span>{prediction.environmentFactors.moisture.actual}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Optimal:</span>
                              <span>{prediction.environmentFactors.moisture.optimal}%</span>
                            </div>
                          </div>
                          
                          <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1">
                                <Sun className="h-4 w-4 text-amber-500" />
                                <h4 className="font-medium">Light</h4>
                              </div>
                              <Badge variant={
                                prediction.environmentFactors.light.factor > 80 ? "default" :
                                prediction.environmentFactors.light.factor > 60 ? "secondary" :
                                "destructive"
                              }>
                                {prediction.environmentFactors.light.factor}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span>{prediction.environmentFactors.light.actual}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Optimal:</span>
                              <span>{prediction.environmentFactors.light.optimal}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 border rounded-md">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Overall Growth Environment</h4>
                            <Badge variant={
                              prediction.growthFactor > 80 ? "default" :
                              prediction.growthFactor > 60 ? "secondary" :
                              "destructive"
                            }>
                              {prediction.environmentQuality}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">
                            {prediction.environmentQuality === 'Optimal' ? 
                              'Current conditions are ideal for plant growth. No adjustments needed.' :
                            prediction.environmentQuality === 'Good' ?
                              'Growing conditions are good but could be improved with minor adjustments.' :
                            prediction.environmentQuality === 'Suboptimal' ?
                              'Growing conditions are affecting plant growth. Consider adjusting environmental factors.' :
                              'Poor conditions are significantly impacting growth. Urgent adjustments needed.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Predictions based on historical environmental data and crop requirements.
                      Actual results may vary based on plant genetics and additional factors.
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Leaf className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Plants Available</h3>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Add plants to your greenhouse to see growth predictions and harvest estimates.
                </p>
                <Button variant="outline">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Go to Plant List
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
