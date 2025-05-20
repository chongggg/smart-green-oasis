import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { 
  Thermometer, 
  Droplet, 
  Sun, 
  Fan,
  Droplet as Pump
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type SensorData = {
  temperature: number;
  humidity: number;
  soil_moisture: number;
  lighting: number;
};

type ActuatorStatus = {
  fan: boolean;
  pump: boolean;
  light: boolean;
};

interface DashboardProps {
  sensorData: SensorData;
  actuatorStatus: ActuatorStatus;
  database: Database;
}

export const Dashboard = ({ sensorData, actuatorStatus, database }: DashboardProps) => {
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  // Fetch plants data
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
        
        // Set first plant as selected if no plant is selected
        if (plantsArray.length > 0 && !selectedPlant) {
          setSelectedPlant(plantsArray[0]);
        }
      }
    });
    
    return () => unsubscribe();
  }, [database, selectedPlant]);
  
  // Fetch historical data for chart
  useEffect(() => {
    const historyRef = query(ref(database, 'history'), orderByChild('timestamp'), limitToLast(10));
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          // Convert timestamp to readable time
          time: new Date(data[key].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setChartData(historyArray);
      }
    });
    
    return () => unsubscribe();
  }, [database]);

  const getSensorColor = (type: string, value: number) => {
    switch (type) {
      case 'temperature':
        return value > 30 ? 'text-red-500' : value < 15 ? 'text-blue-500' : 'text-emerald-500';
      case 'humidity':
        return value > 80 ? 'text-blue-500' : value < 30 ? 'text-red-500' : 'text-emerald-500';
      case 'soil_moisture':
        return value > 80 ? 'text-blue-500' : value < 20 ? 'text-red-500' : 'text-emerald-500';
      case 'lighting':
        return value > 80 ? 'text-amber-500' : value < 20 ? 'text-gray-500' : 'text-amber-500';
      default:
        return 'text-emerald-500';
    }
  };

  const calculatePlantAge = (plantingDate: string) => {
    const start = new Date(plantingDate).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const calculateGrowthPercentage = (plantingDate: string, duration: number) => {
    const age = calculatePlantAge(plantingDate);
    return Math.min(100, Math.round((age / duration) * 100));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Greenhouse Dashboard</h1>
      
      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSensorColor('temperature', sensorData.temperature)}`}>
              {sensorData.temperature.toFixed(1)}°C
            </div>
            <p className="text-xs text-muted-foreground">
              {sensorData.temperature > 30 ? 'High' : sensorData.temperature < 15 ? 'Low' : 'Optimal'}
            </p>
            <Progress 
              value={sensorData.temperature * 2} 
              className={`h-2 mt-2 ${getSensorColor('temperature', sensorData.temperature).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSensorColor('humidity', sensorData.humidity)}`}>
              {sensorData.humidity.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {sensorData.humidity > 80 ? 'High' : sensorData.humidity < 30 ? 'Low' : 'Optimal'}
            </p>
            <Progress 
              value={sensorData.humidity} 
              className={`h-2 mt-2 ${getSensorColor('humidity', sensorData.humidity).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
            <Droplet className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSensorColor('soil_moisture', sensorData.soil_moisture)}`}>
              {sensorData.soil_moisture.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {sensorData.soil_moisture > 80 ? 'Wet' : sensorData.soil_moisture < 20 ? 'Dry' : 'Moist'}
            </p>
            <Progress 
              value={sensorData.soil_moisture} 
              className={`h-2 mt-2 ${getSensorColor('soil_moisture', sensorData.soil_moisture).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lighting</CardTitle>
            <Sun className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSensorColor('lighting', sensorData.lighting)}`}>
              {sensorData.lighting}%
            </div>
            <p className="text-xs text-muted-foreground">
              {sensorData.lighting > 80 ? 'Bright' : sensorData.lighting < 20 ? 'Dark' : 'Moderate'}
            </p>
            <Progress 
              value={sensorData.lighting} 
              className={`h-2 mt-2 ${getSensorColor('lighting', sensorData.lighting).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Actuator Status */}
      <h2 className="text-xl font-semibold mt-8">Automation Status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={actuatorStatus.fan ? "border-green-500" : "border-gray-300"}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fan Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Fan className={`h-8 w-8 ${actuatorStatus.fan ? "text-green-500 animate-spin" : "text-gray-400"}`} />
            <span className={`font-bold ${actuatorStatus.fan ? "text-green-500" : "text-gray-400"}`}>
              {actuatorStatus.fan ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
        
        <Card className={actuatorStatus.pump ? "border-green-500" : "border-gray-300"}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Water Pump Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Droplet className={`h-8 w-8 ${actuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`} />
            <span className={`font-bold ${actuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`}>
              {actuatorStatus.pump ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
        
        <Card className={actuatorStatus.light ? "border-green-500" : "border-gray-300"}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grow Light Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Sun className={`h-8 w-8 ${actuatorStatus.light ? "text-amber-500" : "text-gray-400"}`} />
            <span className={`font-bold ${actuatorStatus.light ? "text-amber-500" : "text-gray-400"}`}>
              {actuatorStatus.light ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
      </div>
      
      {/* Crop, Performance, Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Crop Section */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Crop</CardTitle>
          </CardHeader>
          <CardContent>
            {plants.length > 0 ? (
              <>
                <select
                  className="w-full p-2 rounded border mb-4 bg-card text-card-foreground"
                  value={selectedPlant?.id || ''}
                  onChange={(e) => {
                    const plant = plants.find(p => p.id === e.target.value);
                    setSelectedPlant(plant);
                  }}
                >
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.name}
                    </option>
                  ))}
                </select>
                
                {selectedPlant && (
                  <div className="space-y-4">
                    <div className="p-2 bg-primary/10 rounded font-medium">
                      {selectedPlant.name}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Plant Age</p>
                      <p className="font-bold">{calculatePlantAge(selectedPlant.plantingDate)} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Growth Progress</p>
                      <Progress 
                        value={calculateGrowthPercentage(selectedPlant.plantingDate, selectedPlant.growthDuration)} 
                        className="h-2" 
                      />
                      <p className="text-xs mt-1 text-right">
                        {calculateGrowthPercentage(selectedPlant.plantingDate, selectedPlant.growthDuration)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type: {selectedPlant.cropType}</p>
                      <p className="text-sm text-muted-foreground">Planted: {new Date(selectedPlant.plantingDate).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Expected Harvest: {new Date(new Date(selectedPlant.plantingDate).getTime() + selectedPlant.growthDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">No crops added yet</p>
            )}
          </CardContent>
        </Card>
        
        {/* Performance Chart */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Sensor Readings</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="soil_moisture" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="lighting" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No historical data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
