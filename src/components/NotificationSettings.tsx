
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Phone, Settings, Clock, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { notificationService, NotificationSettings as SettingsType } from '@/services/notificationService';

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>(notificationService.getSettings());
  const [testNotification, setTestNotification] = useState(false);

  const updateSettings = (newSettings: SettingsType) => {
    setSettings(newSettings);
    notificationService.updateSettings(newSettings);
    toast({
      title: 'Settings Updated',
      description: 'Your notification preferences have been saved'
    });
  };

  const handleMethodToggle = (index: number) => {
    const newMethods = [...settings.methods];
    newMethods[index].enabled = !newMethods[index].enabled;
    updateSettings({ ...settings, methods: newMethods });
  };

  const handleAddressChange = (index: number, address: string) => {
    const newMethods = [...settings.methods];
    newMethods[index].address = address;
    setSettings({ ...settings, methods: newMethods });
  };

  const saveAddressChanges = () => {
    notificationService.updateSettings(settings);
    toast({
      title: 'Contact Information Saved',
      description: 'Your email and phone number have been updated'
    });
  };

  const sendTestNotification = async () => {
    setTestNotification(true);
    try {
      await notificationService.sendNotification(
        'Test Notification',
        'This is a test notification from your Smart Greenhouse system.',
        'alert'
      );
      toast({
        title: 'Test Sent',
        description: 'Check your enabled notification methods for the test message'
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'There was an error sending the test notification',
        variant: 'destructive'
      });
    }
    setTestNotification(false);
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'push': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Notification Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure how and when you receive alerts and reminders
        </p>
      </div>

      {/* Notification Methods */}
      <Card className="border-2 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Delivery Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.methods.map((method, index) => (
            <div key={method.type} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMethodIcon(method.type)}
                  <div>
                    <Label className="text-sm font-medium capitalize">
                      {method.type} Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {method.type === 'push' ? 'Browser notifications' : 
                       method.type === 'email' ? 'Email alerts' : 'SMS messages'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={method.enabled ? 'default' : 'secondary'}>
                    {method.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={() => handleMethodToggle(index)}
                  />
                </div>
              </div>
              
              {method.type !== 'push' && (
                <div className="ml-7">
                  <Input
                    placeholder={method.type === 'email' ? 'your@email.com' : '+1234567890'}
                    value={method.address}
                    onChange={(e) => handleAddressChange(index, e.target.value)}
                    className="max-w-sm"
                    disabled={!method.enabled}
                  />
                </div>
              )}
              
              {index < settings.methods.length - 1 && <Separator />}
            </div>
          ))}
          
          <div className="flex gap-2 mt-4">
            <Button onClick={saveAddressChanges} variant="outline" size="sm">
              Save Contact Info
            </Button>
            <Button 
              onClick={sendTestNotification} 
              variant="outline" 
              size="sm"
              disabled={testNotification}
            >
              {testNotification ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card className="border-2 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">System Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Temperature, moisture, and equipment alerts
              </p>
            </div>
            <Switch
              checked={settings.enableSystemAlerts}
              onCheckedChange={(checked) => 
                updateSettings({ ...settings, enableSystemAlerts: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Plant Care Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Watering, fertilizing, and maintenance reminders
              </p>
            </div>
            <Switch
              checked={settings.enableReminders}
              onCheckedChange={(checked) => 
                updateSettings({ ...settings, enableReminders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="border-2 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.quietHours.enabled ? 
              <VolumeX className="h-5 w-5 text-primary" /> : 
              <Clock className="h-5 w-5 text-primary" />
            }
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">
                Suppress notifications during specified hours
              </p>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(checked) => 
                updateSettings({ 
                  ...settings, 
                  quietHours: { ...settings.quietHours, enabled: checked }
                })
              }
            />
          </div>
          
          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 ml-4">
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => 
                    updateSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, start: e.target.value }
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => 
                    updateSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, end: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
