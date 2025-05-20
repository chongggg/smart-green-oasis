import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { 
  Thermometer, 
  Droplet, 
  Sun, 
  Fan,
  Droplet as Pump,
  CalendarDays,
  CalendarCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { Badge } from "@/components/ui/badge";
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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<{date: Date; type: string; name: string}[]>([]);
  
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

        // Create calendar events for planting and harvest dates
        const events = [];
        for (const plant of plantsArray) {
          // Add planting date
          if (plant.plantingDate) {
            events.push({
              date: new Date(plant.plantingDate),
              type: 'planting',
              name: plant.name
            });
          }

          // Add harvest date (calculated from planting date + growth duration)
          if (plant.plantingDate && plant.growthDuration) {
            const harvestDate = new Date(new Date(plant.plantingDate).getTime() + plant.growthDuration * 24 * 60 * 60 * 1000);
            events.push({
              date: harvestDate,
              type: 'harvest',
              name: plant.name
            });
          }
        }
        setCalendarEvents(events);
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

  // Calendar day rendering with event indicators
  const renderCalendarCell = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const todayEvents = calendarEvents.filter(event => 
      format(event.date, 'yyyy-MM-dd') === formattedDate
    );
    
    const hasPlantingEvent = todayEvents.some(event => event.type === 'planting');
    const hasHarvestEvent = todayEvents.some(event => event.type === 'harvest');
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {date.getDate()}
        <div className="absolute bottom-0 flex gap-1 justify-center">
          {hasPlantingEvent && (
            <div className="h-1 w-1 rounded-full bg-green-500"></div>
          )}
          {hasHarvestEvent && (
            <div className="h-1 w-1 rounded-full bg-amber-500"></div>
          )}
        </div>
      </div>
    );
  };

  // Get events for selected date
  const getEventsForSelectedDate = () => {
    if (!date) return [];
    
    const formattedSelectedDate = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => 
      format(event.date, 'yyyy-MM-dd') === formattedSelectedDate
    );
  };

  const selectedDateEvents = getEventsForSelectedDate();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Greenhouse Dashboard</h1>
      
      {/* Calendar replacing Sensor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              Crop Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border shadow"
                  modifiers={{
                    eventDay: calendarEvents.map(event => event.date)
                  }}
                  modifiersStyles={{
                    eventDay: { fontWeight: 'bold' }
                  }}
                />
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Planting Date</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm">Harvest Date</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4">
                  {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
                </h3>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{event.name}</span>
                          <Badge variant={event.type === 'planting' ? 'default' : 'secondary'}>
                            {event.type === 'planting' ? (
                              <><CalendarDays className="h-3 w-3 mr-1" /> Planting Day</>
                            ) : (
                              <><CalendarCheck className="h-3 w-3 mr-1" /> Harvest Day</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.type === 'planting' 
                            ? 'Plant was seeded on this day' 
                            : 'Expected harvest date'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-md">
                    <p className="text-muted-foreground">No events for this date</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actuator Status */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-md flex justify-between items-center ${actuatorStatus.fan ? "bg-green-100 dark:bg-green-900/20" : "bg-gray-100 dark:bg-gray-800/50"}`}>
              <div className="flex items-center gap-3">
                <Fan className={`h-6 w-6 ${actuatorStatus.fan ? "text-green-500 animate-spin" : "text-gray-400"}`} />
                <span className="font-medium">Fan Status</span>
              </div>
              <span className={`font-bold ${actuatorStatus.fan ? "text-green-500" : "text-gray-400"}`}>
                {actuatorStatus.fan ? "ON" : "OFF"}
              </span>
            </div>
            
            <div className={`p-4 rounded-md flex justify-between items-center ${actuatorStatus.pump ? "bg-blue-100 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-800/50"}`}>
              <div className="flex items-center gap-3">
                <Droplet className={`h-6 w-6 ${actuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`} />
                <span className="font-medium">Water Pump</span>
              </div>
              <span className={`font-bold ${actuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`}>
                {actuatorStatus.pump ? "ON" : "OFF"}
              </span>
            </div>
            
            <div className={`p-4 rounded-md flex justify-between items-center ${actuatorStatus.light ? "bg-amber-100 dark:bg-amber-900/20" : "bg-gray-100 dark:bg-gray-800/50"}`}>
              <div className="flex items-center gap-3">
                <Sun className={`h-6 w-6 ${actuatorStatus.light ? "text-amber-500" : "text-gray-400"}`} />
                <span className="font-medium">Grow Light</span>
              </div>
              <span className={`font-bold ${actuatorStatus.light ? "text-amber-500" : "text-gray-400"}`}>
                {actuatorStatus.light ? "ON" : "OFF"}
              </span>
            </div>

            <div className="p-4 rounded-md bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className={`text-lg font-semibold ${getSensorColor('temperature', sensorData.temperature)}`}>
                    {sensorData.temperature.toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Humidity</p>
                  <p className={`text-lg font-semibold ${getSensorColor('humidity', sensorData.humidity)}`}>
                    {sensorData.humidity.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Soil Moisture</p>
                  <p className={`text-lg font-semibold ${getSensorColor('soil_moisture', sensorData.soil_moisture)}`}>
                    {sensorData.soil_moisture.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Light Level</p>
                  <p className={`text-lg font-semibold ${getSensorColor('lighting', sensorData.lighting)}`}>
                    {sensorData.lighting}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Crop and Performance Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
