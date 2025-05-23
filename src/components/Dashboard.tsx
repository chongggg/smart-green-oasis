import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { 
  Thermometer, 
  Droplet, 
  Sun, 
  Fan,
  Droplet as Pump,
  CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

type PlantEvent = {
  date: Date;
  title: string;
  type: 'planting' | 'harvest';
  plantId: string;
};

interface DashboardProps {
  sensorData: SensorData;
  actuatorStatus: ActuatorStatus;
  database: Database;
}

export const Dashboard = ({ sensorData, actuatorStatus, database }: DashboardProps) => {
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<PlantEvent[]>([]);
  const [realActuatorStatus, setRealActuatorStatus] = useState({
    fan: false,
    pump: false,
    light: false
  });
  
  // Fetch real actuator status directly from Firebase
  useEffect(() => {
    const actuatorRef = ref(database, 'actuator_status');
    const unsubscribe = onValue(actuatorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRealActuatorStatus({
          fan: data.fan || false,
          pump: data.pump || false,
          light: data.light || false
        });
      }
    });
    
    return () => unsubscribe();
  }, [database]);
  
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

        // Create events for planting and harvest dates
        const plantEvents: PlantEvent[] = [];
        plantsArray.forEach(plant => {
          // Add planting date event
          const plantingDate = new Date(plant.plantingDate);
          plantEvents.push({
            date: plantingDate,
            title: `${plant.name} planted`,
            type: 'planting',
            plantId: plant.id
          });
          
          // Calculate and add harvest date event
          const harvestDate = new Date(plantingDate);
          harvestDate.setDate(harvestDate.getDate() + plant.growthDuration);
          plantEvents.push({
            date: harvestDate,
            title: `${plant.name} harvest`,
            type: 'harvest',
            plantId: plant.id
          });
        });
        
        setEvents(plantEvents);
      }
    });
    
    return () => unsubscribe();
  }, [database, selectedPlant]);

  // Update events for selected date when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateEvents = events.filter(event => 
        event.date.getDate() === selectedDate.getDate() &&
        event.date.getMonth() === selectedDate.getMonth() &&
        event.date.getFullYear() === selectedDate.getFullYear()
      );
      setEventsForSelectedDate(dateEvents);
    } else {
      setEventsForSelectedDate([]);
    }
  }, [selectedDate, events]);

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

  // Function to determine if a date has events
  const hasEventOnDate = (date: Date) => {
    return events.some(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Calendar modifiers for styling dates with events
  const modifiers = {
    planting: events
      .filter(event => event.type === 'planting')
      .map(event => new Date(event.date)),
    harvest: events
      .filter(event => event.type === 'harvest')
      .map(event => new Date(event.date)),
  };

  // Modifier styles for the calendar
  const modifiersStyles = {
    planting: {
      color: 'white',
      backgroundColor: '#10b981', // Green for planting
    },
    harvest: {
      color: 'white', 
      backgroundColor: '#f59e0b', // Amber for harvest
    },
  };

  // Get sensor status text and style
  const getSensorStatus = (type: string, value: number) => {
    switch (type) {
      case 'temperature':
        return value > 30 ? { text: 'High', color: 'text-red-500' } : 
               value < 15 ? { text: 'Low', color: 'text-blue-500' } : 
               { text: 'Optimal', color: 'text-emerald-500' };
      case 'humidity':
        return value > 80 ? { text: 'High', color: 'text-blue-500' } : 
               value < 30 ? { text: 'Low', color: 'text-red-500' } : 
               { text: 'Optimal', color: 'text-emerald-500' };
      case 'soil_moisture':
        return value > 80 ? { text: 'Wet', color: 'text-blue-500' } : 
               value < 20 ? { text: 'Dry', color: 'text-red-500' } : 
               { text: 'Moist', color: 'text-emerald-500' };
      case 'lighting':
        return value > 80 ? { text: 'Bright', color: 'text-amber-500' } : 
               value < 20 ? { text: 'Dark', color: 'text-gray-500' } : 
               { text: 'Moderate', color: 'text-amber-500' };
      default:
        return { text: 'Normal', color: 'text-emerald-500' };
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Greenhouse Dashboard</h1>
      
      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="sensor-card temperature-card relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent className="sensor-card-content">
            <div className="flex items-baseline gap-1">
              <div className={`text-3xl font-bold ${getSensorStatus('temperature', sensorData.temperature).color}`}>
                {sensorData.temperature.toFixed(1)}
              </div>
              <span className="text-xl">°C</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className={`text-xs ${getSensorStatus('temperature', sensorData.temperature).color}`}>
                {getSensorStatus('temperature', sensorData.temperature).text}
              </p>
              <Badge variant={sensorData.temperature > 30 ? "destructive" : sensorData.temperature < 15 ? "secondary" : "default"} className="text-xs">
                {sensorData.temperature > 30 ? "Too Hot" : sensorData.temperature < 15 ? "Too Cold" : "Just Right"}
              </Badge>
            </div>
            <Progress 
              value={sensorData.temperature * 2} 
              className={`h-2 mt-3 ${getSensorColor('temperature', sensorData.temperature).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card className="sensor-card humidity-card relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="sensor-card-content">
            <div className="flex items-baseline gap-1">
              <div className={`text-3xl font-bold ${getSensorStatus('humidity', sensorData.humidity).color}`}>
                {sensorData.humidity.toFixed(1)}
              </div>
              <span className="text-xl">%</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className={`text-xs ${getSensorStatus('humidity', sensorData.humidity).color}`}>
                {getSensorStatus('humidity', sensorData.humidity).text}
              </p>
              <Badge variant={sensorData.humidity > 80 ? "secondary" : sensorData.humidity < 30 ? "destructive" : "default"} className="text-xs">
                {sensorData.humidity > 80 ? "Too Humid" : sensorData.humidity < 30 ? "Too Dry" : "Balanced"}
              </Badge>
            </div>
            <Progress 
              value={sensorData.humidity} 
              className={`h-2 mt-3 ${getSensorColor('humidity', sensorData.humidity).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card className="sensor-card moisture-card relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
            <Droplet className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="sensor-card-content">
            <div className="flex items-baseline gap-1">
              <div className={`text-3xl font-bold ${getSensorStatus('soil_moisture', sensorData.soil_moisture).color}`}>
                {sensorData.soil_moisture.toFixed(1)}
              </div>
              <span className="text-xl">%</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className={`text-xs ${getSensorStatus('soil_moisture', sensorData.soil_moisture).color}`}>
                {getSensorStatus('soil_moisture', sensorData.soil_moisture).text}
              </p>
              <Badge variant={sensorData.soil_moisture > 80 ? "secondary" : sensorData.soil_moisture < 20 ? "destructive" : "default"} className="text-xs">
                {sensorData.soil_moisture > 80 ? "Over-Watered" : sensorData.soil_moisture < 20 ? "Under-Watered" : "Well-Watered"}
              </Badge>
            </div>
            <Progress 
              value={sensorData.soil_moisture} 
              className={`h-2 mt-3 ${getSensorColor('soil_moisture', sensorData.soil_moisture).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
        
        <Card className="sensor-card light-card relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lighting</CardTitle>
            <Sun className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent className="sensor-card-content">
            <div className="flex items-baseline gap-1">
              <div className={`text-3xl font-bold ${getSensorStatus('lighting', sensorData.lighting).color}`}>
                {sensorData.lighting}
              </div>
              <span className="text-xl">%</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className={`text-xs ${getSensorStatus('lighting', sensorData.lighting).color}`}>
                {getSensorStatus('lighting', sensorData.lighting).text}
              </p>
              <Badge variant={sensorData.lighting > 80 ? "default" : sensorData.lighting < 20 ? "secondary" : "outline"} className="text-xs">
                {sensorData.lighting > 80 ? "Full Sun" : sensorData.lighting < 20 ? "Low Light" : "Partial Sun"}
              </Badge>
            </div>
            <Progress 
              value={sensorData.lighting} 
              className={`h-2 mt-3 ${getSensorColor('lighting', sensorData.lighting).replace('text-', 'bg-')}`}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Actuator Status */}
      <h2 className="text-xl font-semibold mt-8">Automation Status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`transition-all duration-300 ${realActuatorStatus.fan ? "border-green-500 shadow-md shadow-green-100" : "border-gray-300"}`}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fan Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Fan className={`h-8 w-8 ${realActuatorStatus.fan ? "text-green-500 animate-spin" : "text-gray-400"}`} />
            <span className={`font-bold ${realActuatorStatus.fan ? "text-green-500" : "text-gray-400"}`}>
              {realActuatorStatus.fan ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
        
        <Card className={`transition-all duration-300 ${realActuatorStatus.pump ? "border-blue-500 shadow-md shadow-blue-100" : "border-gray-300"}`}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Water Pump Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Pump className={`h-8 w-8 ${realActuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`} />
            <span className={`font-bold ${realActuatorStatus.pump ? "text-blue-500" : "text-gray-400"}`}>
              {realActuatorStatus.pump ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
        
        <Card className={`transition-all duration-300 ${realActuatorStatus.light ? "border-amber-500 shadow-md shadow-amber-100" : "border-gray-300"}`}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grow Light Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <Sun className={`h-8 w-8 ${realActuatorStatus.light ? "text-amber-500" : "text-gray-400"}`} />
            <span className={`font-bold ${realActuatorStatus.light ? "text-amber-500" : "text-gray-400"}`}>
              {realActuatorStatus.light ? "ON" : "OFF"}
            </span>
          </CardContent>
        </Card>
      </div>
      
      {/* Crop, Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Crop Section */}
        <Card className="card-greenhouse">
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
        
        {/* Calendar Section */}
        <Card className="col-span-1 md:col-span-2 card-greenhouse">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Crop Calendar</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border p-3 pointer-events-auto bg-card/50 backdrop-blur-sm"
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                />
              </div>
              <div className="flex-1">
                <div className="border rounded-md p-4 h-full bg-card/50 backdrop-blur-sm">
                  <h3 className="font-medium mb-4">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Select a date'}
                  </h3>
                  
                  <div className="space-y-2">
                    {eventsForSelectedDate.length > 0 ? (
                      eventsForSelectedDate.map((event, i) => (
                        <div key={i} 
                          className={`flex items-center gap-2 border-l-4 pl-2 py-2 rounded-sm bg-white/40 backdrop-blur-sm shadow-sm ${
                            event.type === 'planting' ? "border-emerald-500" : "border-amber-500"
                          }`}>
                          <Badge variant={event.type === 'planting' ? 'default' : 'secondary'}>
                            {event.type === 'planting' ? 'Planting' : 'Harvest'}
                          </Badge>
                          <span>{event.title}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No events scheduled for this date</p>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs">Planting</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-xs">Harvest</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
