
import React from 'react';
import { Database, ref, set } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Fan, 
  Droplet, 
  Sun, 
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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

export const Controls = ({ 
  automationEnabled, 
  actuatorStatus, 
  database,
  toast
}: ControlsProps) => {
  
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
      await set(ref(database, `manual_control/${device}`), !currentState);
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
