
import React, { useState, useEffect } from 'react';
import { Database, ref, set, get } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Fan, 
  Droplet, 
  Sun, 
  Power,
  Sliders,
  Gauge,
  Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ControlsProps {
  automationEnabled: boolean;
  actuatorStatus: {
    fan: boolean;
    pump: boolean;
    light: boolean;
  };
  database: Database;
  toast: any;
}

// Define seasons with their recommended thresholds - adjusted for Philippines which has mainly wet and dry seasons
const seasonPresets = {
  dry: {
    name: 'Dry Season',
    temperature: 32,
    moisture: 40,
    light: 15,
    description: 'Hot temperatures, increased watering, natural sunlight (March to May)'
  },
  wet: {
    name: 'Wet Season',
    temperature: 28,
    moisture: 30,
    light: 30,
    description: 'Humid weather, moderate watering, increased lighting (June to November)'
  },
  cool: {
    name: 'Cool Dry Season',
    temperature: 26,
    moisture: 25,
    light: 25,
    description: 'Cooler temperatures, reduced watering, moderate lighting (December to February)'
  }
};

// Define crop types with their optimal settings
const cropPresets = {
  leafyVegetables: {
    name: 'Leafy Vegetables',
    temperature: 25,
    moisture: 60,
    light: 40,
    description: 'Ideal for pechay, lettuce, kangkong, and mustard greens'
  },
  fruitVegetables: {
    name: 'Fruit Vegetables',
    temperature: 30,
    moisture: 50,
    light: 60,
    description: 'Optimal for tomatoes, eggplants, okra, and peppers'
  },
  rootCrops: {
    name: 'Root Crops',
    temperature: 28,
    moisture: 45,
    light: 30,
    description: 'Best for carrots, radish, sweet potato, and ginger'
  },
  herbs: {
    name: 'Herbs',
    temperature: 24,
    moisture: 40,
    light: 35,
    description: 'Suitable for basil, mint, oregano, and rosemary'
  }
};

export const Controls = ({ 
  automationEnabled, 
  actuatorStatus, 
  database,
  toast
}: ControlsProps) => {
  // State for threshold values
  const [thresholds, setThresholds] = useState({
    temperature: 31,
    moisture: 20,
    light: 20
  });
  
  // State for threshold mode (manual, season-based, or crop-based)
  const [thresholdMode, setThresholdMode] = useState<'manual' | 'season' | 'crop'>('manual');
  
  // State for selected season and crop
  const [selectedSeason, setSelectedSeason] = useState<'dry' | 'wet' | 'cool'>('wet');
  const [selectedCrop, setSelectedCrop] = useState<'leafyVegetables' | 'fruitVegetables' | 'rootCrops' | 'herbs'>('leafyVegetables');
  
  // Fetch current thresholds on component mount
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        // Match the Firebase structure as described by the user
        const tempRef = ref(database, 'settings/temp_threshold');
        const moistRef = ref(database, 'settings/moisture_threshold');
        const lightRef = ref(database, 'settings/light_threshold');
        
        const tempSnapshot = await get(tempRef);
        const moistSnapshot = await get(moistRef);
        const lightSnapshot = await get(lightRef);
        
        setThresholds({
          temperature: tempSnapshot.exists() ? tempSnapshot.val() : 31,
          moisture: moistSnapshot.exists() ? moistSnapshot.val() : 20,
          light: lightSnapshot.exists() ? lightSnapshot.val() : 20
        });
        
        // Also get threshold mode settings if they exist
        const modeRef = ref(database, 'settings/threshold_mode');
        const seasonRef = ref(database, 'settings/selected_season');
        const cropRef = ref(database, 'settings/selected_crop');
        
        const modeSnapshot = await get(modeRef);
        const seasonSnapshot = await get(seasonRef);
        const cropSnapshot = await get(cropRef);
        
        if (modeSnapshot.exists()) {
          setThresholdMode(modeSnapshot.val() || 'manual');
        }
        
        if (seasonSnapshot.exists()) {
          setSelectedSeason(seasonSnapshot.val() || 'wet');
        }
        
        if (cropSnapshot.exists()) {
          setSelectedCrop(cropSnapshot.val() || 'leafyVegetables');
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    
    fetchThresholds();
  }, [database]);
  
  const toggleAutomation = async () => {
    try {
      await set(ref(database, 'settings/automation'), !automationEnabled);
      toast({
        title: `Automation ${!automationEnabled ? 'enabled' : 'disabled'}`,
        description: `The greenhouse system will now operate in ${!automationEnabled ? 'automatic' : 'manual'} mode.`
      });
    } catch (error) {
      console.error("Error toggling automation:", error);
      toast({
        title: "Error",
        description: "Failed to toggle automation mode.",
        variant: "destructive"
      });
    }
  };
  
  const toggleDevice = async (device: string, currentState: boolean) => {
    try {
      await set(ref(database, `actuator_status/${device}`), !currentState);
      toast({
        title: `${device.charAt(0).toUpperCase() + device.slice(1)} ${!currentState ? 'activated' : 'deactivated'}`,
        description: `The ${device} has been turned ${!currentState ? 'on' : 'off'}.`
      });
    } catch (error) {
      console.error(`Error toggling ${device}:`, error);
      toast({
        title: "Error",
        description: `Failed to toggle ${device}.`,
        variant: "destructive"
      });
    }
  };
  
  // Update threshold values in Firebase
  const updateThresholds = async () => {
    try {
      // If season-based or crop-based, use the selected preset values
      let updatedThresholds = thresholds;
      
      if (thresholdMode === 'season') {
        updatedThresholds = {
          temperature: seasonPresets[selectedSeason].temperature,
          moisture: seasonPresets[selectedSeason].moisture,
          light: seasonPresets[selectedSeason].light
        };
      } else if (thresholdMode === 'crop') {
        updatedThresholds = {
          temperature: cropPresets[selectedCrop].temperature,
          moisture: cropPresets[selectedCrop].moisture,
          light: cropPresets[selectedCrop].light
        };
      }
      
      // Update threshold values based on the Firebase structure
      await set(ref(database, 'settings/temp_threshold'), updatedThresholds.temperature);
      await set(ref(database, 'settings/moisture_threshold'), updatedThresholds.moisture);
      await set(ref(database, 'settings/light_threshold'), updatedThresholds.light);
      
      // Also save the mode and selected preset
      await set(ref(database, 'settings/threshold_mode'), thresholdMode);
      await set(ref(database, 'settings/selected_season'), selectedSeason);
      await set(ref(database, 'settings/selected_crop'), selectedCrop);
      
      // Update ESP32 thresholds for real-time control
      await set(ref(database, 'system_thresholds/temp_thresh'), updatedThresholds.temperature);
      await set(ref(database, 'system_thresholds/moist_thresh'), updatedThresholds.moisture);
      await set(ref(database, 'system_thresholds/lum_thresh'), updatedThresholds.light);
      
      toast({
        title: "Thresholds updated",
        description: "The system thresholds have been updated successfully."
      });
    } catch (error) {
      console.error("Error updating thresholds:", error);
      toast({
        title: "Error",
        description: "Failed to update thresholds.",
        variant: "destructive"
      });
    }
  };
  
  // Handle season change
  const handleSeasonChange = (season: 'dry' | 'wet' | 'cool') => {
    setSelectedSeason(season);
  };
  
  // Handle crop change
  const handleCropChange = (crop: 'leafyVegetables' | 'fruitVegetables' | 'rootCrops' | 'herbs') => {
    setSelectedCrop(crop);
  };
  
  // Handle threshold input change
  const handleThresholdChange = (type: string, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [type]: value
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Controls</h1>
      </div>

      {/* Automation Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            System Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{automationEnabled ? 'Automatic Mode' : 'Manual Mode'}</p>
              <p className="text-sm text-muted-foreground">
                {automationEnabled 
                  ? 'System will automatically control devices based on sensor readings' 
                  : 'Manually control each device'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="automation-mode">
                {automationEnabled ? 'Auto' : 'Manual'}
              </Label>
              <Switch 
                id="automation-mode" 
                checked={automationEnabled}
                onCheckedChange={toggleAutomation}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Threshold Settings
          </CardTitle>
          <CardDescription>
            Configure when your greenhouse systems should activate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={thresholdMode} onValueChange={(value) => setThresholdMode(value as 'manual' | 'season' | 'crop')}>
            <TabsList className="mb-4">
              <TabsTrigger value="manual">Manual Control</TabsTrigger>
              <TabsTrigger value="season">Season Adaptive</TabsTrigger>
              <TabsTrigger value="crop">Crop Specific</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Temperature Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tempThresh" className="flex items-center gap-1">
                      <Gauge size={16} className="text-red-500" />
                      Temperature (°C)
                    </Label>
                    <span className="text-sm font-medium">{thresholds.temperature}°C</span>
                  </div>
                  <Input 
                    id="tempThresh"
                    type="number" 
                    placeholder="Temperature Threshold" 
                    value={thresholds.temperature}
                    onChange={(e) => handleThresholdChange('temperature', parseFloat(e.target.value))}
                    min={10}
                    max={40}
                  />
                  <p className="text-xs text-muted-foreground">Fan activates above this temperature</p>
                </div>
                
                {/* Soil Moisture Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="moistThresh" className="flex items-center gap-1">
                      <Droplet size={16} className="text-blue-500" />
                      Soil Moisture (%)
                    </Label>
                    <span className="text-sm font-medium">{thresholds.moisture}%</span>
                  </div>
                  <Input 
                    id="moistThresh"
                    type="number" 
                    placeholder="Moisture Threshold" 
                    value={thresholds.moisture}
                    onChange={(e) => handleThresholdChange('moisture', parseFloat(e.target.value))}
                    min={5}
                    max={95}
                  />
                  <p className="text-xs text-muted-foreground">Pump activates below this moisture level</p>
                </div>
                
                {/* Light Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lightThresh" className="flex items-center gap-1">
                      <Sun size={16} className="text-amber-500" />
                      Light Level (%)
                    </Label>
                    <span className="text-sm font-medium">{thresholds.light}%</span>
                  </div>
                  <Input 
                    id="lightThresh"
                    type="number" 
                    placeholder="Light Threshold" 
                    value={thresholds.light}
                    onChange={(e) => handleThresholdChange('light', parseFloat(e.target.value))}
                    min={5}
                    max={95}
                  />
                  <p className="text-xs text-muted-foreground">Grow lights activate below this light level</p>
                </div>
              </div>
              
              <Button 
                onClick={updateThresholds} 
                className="w-full mt-4"
              >
                Update Manual Thresholds
              </Button>
            </TabsContent>
            
            <TabsContent value="season" className="space-y-4">
              <div className="flex mb-4 items-center gap-2">
                <Cloud className="text-blue-500" />
                <p className="text-sm">
                  Select a seasonal preset optimized for Philippines climate
                </p>
              </div>
              
              <RadioGroup
                value={selectedSeason}
                onValueChange={(value) => handleSeasonChange(value as 'dry' | 'wet' | 'cool')}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {Object.entries(seasonPresets).map(([season, preset]) => (
                  <div key={season} className="relative">
                    <RadioGroupItem
                      value={season}
                      id={season}
                      className="absolute top-4 left-4 z-10"
                    />
                    <Label
                      htmlFor={season}
                      className={`flex flex-col border p-4 rounded-md cursor-pointer transition-all ${
                        selectedSeason === season
                          ? 'bg-accent border-primary'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="font-medium mb-1">{preset.name}</span>
                      <span className="text-xs text-muted-foreground mb-3">
                        {preset.description}
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Gauge size={14} className="text-red-500" />
                          <span>{preset.temperature}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplet size={14} className="text-blue-500" />
                          <span>{preset.moisture}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun size={14} className="text-amber-500" />
                          <span>{preset.light}%</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              <Button 
                onClick={updateThresholds} 
                className="w-full mt-4"
              >
                Apply Seasonal Thresholds
              </Button>
            </TabsContent>
            
            <TabsContent value="crop" className="space-y-4">
              <div className="flex mb-4 items-center gap-2">
                <Droplet className="text-green-500" />
                <p className="text-sm">
                  Select crop-specific settings for optimal growth
                </p>
              </div>
              
              <RadioGroup
                value={selectedCrop}
                onValueChange={(value) => handleCropChange(value as 'leafyVegetables' | 'fruitVegetables' | 'rootCrops' | 'herbs')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {Object.entries(cropPresets).map(([crop, preset]) => (
                  <div key={crop} className="relative">
                    <RadioGroupItem
                      value={crop}
                      id={crop}
                      className="absolute top-4 left-4 z-10"
                    />
                    <Label
                      htmlFor={crop}
                      className={`flex flex-col border p-4 rounded-md cursor-pointer transition-all ${
                        selectedCrop === crop
                          ? 'bg-accent border-primary'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="font-medium mb-1">{preset.name}</span>
                      <span className="text-xs text-muted-foreground mb-3">
                        {preset.description}
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Gauge size={14} className="text-red-500" />
                          <span>{preset.temperature}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplet size={14} className="text-blue-500" />
                          <span>{preset.moisture}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun size={14} className="text-amber-500" />
                          <span>{preset.light}%</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              <Button 
                onClick={updateThresholds} 
                className="w-full mt-4"
              >
                Apply Crop-Specific Thresholds
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Device Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!automationEnabled ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Automation is disabled. You can manually control the devices below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fan Control */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fan className={`h-5 w-5 ${actuatorStatus.fan ? "text-green-500" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">Ventilation Fan</p>
                          <p className="text-xs text-muted-foreground">Status: {actuatorStatus.fan ? 'Running' : 'Off'}</p>
                        </div>
                      </div>
                      <Button 
                        variant={actuatorStatus.fan ? "destructive" : "default"}
                        onClick={() => toggleDevice('fan', actuatorStatus.fan)}
                      >
                        {actuatorStatus.fan ? 'Turn Off' : 'Turn On'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Water Pump Control */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplet className={`h-5 w-5 ${actuatorStatus.pump ? "text-blue-500" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">Water Pump</p>
                          <p className="text-xs text-muted-foreground">Status: {actuatorStatus.pump ? 'Running' : 'Off'}</p>
                        </div>
                      </div>
                      <Button 
                        variant={actuatorStatus.pump ? "destructive" : "default"}
                        onClick={() => toggleDevice('pump', actuatorStatus.pump)}
                      >
                        {actuatorStatus.pump ? 'Turn Off' : 'Turn On'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Grow Light Control */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className={`h-5 w-5 ${actuatorStatus.light ? "text-amber-500" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">Grow Light</p>
                          <p className="text-xs text-muted-foreground">Status: {actuatorStatus.light ? 'On' : 'Off'}</p>
                        </div>
                      </div>
                      <Button 
                        variant={actuatorStatus.light ? "destructive" : "default"}
                        onClick={() => toggleDevice('light', actuatorStatus.light)}
                      >
                        {actuatorStatus.light ? 'Turn Off' : 'Turn On'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6">
              <div className="text-amber-500 mb-2">
                <Power className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-medium mb-2">Automation is Enabled</h3>
              <p className="text-center text-muted-foreground mb-4">
                The system is currently operating in automatic mode. Disable automation to take manual control.
              </p>
              <Button 
                variant="outline"
                onClick={toggleAutomation}
              >
                Switch to Manual Mode
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
