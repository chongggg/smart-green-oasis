
import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, set, push } from 'firebase/database';
import { BellRing, Calendar, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

export type NotificationType = 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: NotificationType;
  read: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: number;
  completed: boolean;
}

interface NotificationsProps {
  database: Database;
  sensorData: {
    temperature: number;
    humidity: number;
    soil_moisture: number;
    lighting: number;
  };
}

export const Notifications = ({ database, sensorData }: NotificationsProps) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');

  // Fetch notifications from Firebase
  useEffect(() => {
    const notificationsRef = ref(database, 'notifications');
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationArray: Notification[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationArray);
      } else {
        setNotifications([]);
      }
    });
    
    return () => unsubscribe();
  }, [database]);
  
  // Fetch reminders from Firebase
  useEffect(() => {
    const remindersRef = ref(database, 'reminders');
    const unsubscribe = onValue(remindersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reminderArray: Reminder[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.dueDate - b.dueDate);
        
        setReminders(reminderArray);
      } else {
        setReminders([]);
      }
    });
    
    return () => unsubscribe();
  }, [database]);
  
  // Automatically generate threshold-based alerts
  useEffect(() => {
    if (!notificationsEnabled) return;
    
    // Check temperature thresholds
    if (sensorData.temperature > 35) {
      createSystemAlert(
        'High Temperature Alert',
        `Temperature is critically high at ${sensorData.temperature.toFixed(1)}°C. Consider cooling measures.`,
        'warning'
      );
    }
    
    // Check soil moisture thresholds
    if (sensorData.soil_moisture < 15) {
      createSystemAlert(
        'Low Moisture Alert',
        `Soil moisture is critically low at ${sensorData.soil_moisture.toFixed(1)}%. Plants may need watering.`,
        'warning'
      );
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorData, notificationsEnabled]);
  
  // Create a new system alert
  const createSystemAlert = (title: string, message: string, type: NotificationType) => {
    // Check if a similar notification was created in the last hour to avoid spamming
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const similarNotificationExists = notifications.some(
      n => n.title === title && n.timestamp > oneHourAgo
    );
    
    if (!similarNotificationExists) {
      const newNotification = {
        title,
        message,
        timestamp: Date.now(),
        type,
        read: false
      };
      
      const notificationsRef = ref(database, 'notifications');
      push(notificationsRef, newNotification);
      
      toast({
        title: title,
        description: message,
        variant: type === 'warning' ? 'destructive' : type === 'success' ? 'default' : 'secondary',
      });
    }
  };
  
  // Create a new reminder
  const createReminder = () => {
    const newReminder = {
      title: 'New Plant Care Task',
      description: 'Add description for your plant care task',
      dueDate: Date.now() + (24 * 60 * 60 * 1000), // Default: tomorrow
      completed: false
    };
    
    const remindersRef = ref(database, 'reminders');
    push(remindersRef, newReminder);
    
    toast({
      title: 'Reminder Created',
      description: 'A new plant care reminder has been created'
    });
  };
  
  // Mark a notification as read
  const markAsRead = (notificationId: string) => {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    set(notificationRef, {
      ...notifications.find(n => n.id === notificationId),
      read: true
    });
  };
  
  // Delete a notification
  const deleteNotification = (notificationId: string) => {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    set(notificationRef, null);
  };
  
  // Toggle reminder completion
  const toggleReminderCompletion = (reminderId: string, isCompleted: boolean) => {
    const reminderRef = ref(database, `reminders/${reminderId}`);
    set(reminderRef, {
      ...reminders.find(r => r.id === reminderId),
      completed: !isCompleted
    });
  };
  
  // Delete a reminder
  const deleteReminder = (reminderId: string) => {
    const reminderRef = ref(database, `reminders/${reminderId}`);
    set(reminderRef, null);
  };
  
  // Format timestamp to readable date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Calculate time remaining for reminders
  const getTimeRemaining = (dueTimestamp: number): string => {
    const now = Date.now();
    const diff = dueTimestamp - now;
    
    if (diff < 0) {
      return 'Overdue';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m remaining`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Reminders</h1>
          <p className="text-muted-foreground mt-1">
            System alerts and plant care tasks
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-2 md:mt-0">
          <Label htmlFor="notifications-toggle">
            System Alerts
          </Label>
          <Switch
            id="notifications-toggle"
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>
      </div>
      
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="alerts">
            System Alerts
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reminders">
            Plant Care Reminders
            {reminders.filter(r => !r.completed).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {reminders.filter(r => !r.completed).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                System Alerts
              </CardTitle>
              <Button
                onClick={() => createSystemAlert('Test Alert', 'This is a test alert', 'info')}
                variant="outline"
                size="sm"
              >
                Test Alert
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border rounded-md p-3 flex gap-3 items-start ${
                          notification.read ? 'bg-muted/20' : 'bg-card'
                        }`}
                      >
                        {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                        {notification.type === 'info' && <BellRing className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                        {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <Badge variant={
                              notification.type === 'warning' ? 'destructive' : 
                              notification.type === 'success' ? 'default' : 
                              'secondary'
                            } className="text-xs">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(notification.timestamp)}
                            </div>
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Mark as read
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BellRing className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No alerts to display</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reminders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Plant Care Reminders
              </CardTitle>
              <Button
                onClick={createReminder}
                size="sm"
              >
                New Reminder
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {reminders.length > 0 ? (
                  <div className="space-y-4">
                    {reminders.map((reminder) => (
                      <div 
                        key={reminder.id} 
                        className={`border rounded-md p-3 ${
                          reminder.completed ? 'bg-muted/20' : 'bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Switch 
                              checked={reminder.completed}
                              onCheckedChange={() => toggleReminderCompletion(reminder.id, reminder.completed)}
                              className="mt-1"
                            />
                            <div>
                              <h4 className={`font-medium ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {reminder.title}
                              </h4>
                              <p className={`text-sm ${reminder.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                                {reminder.description}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="ml-10 mt-2 text-xs flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">Due: {formatDate(reminder.dueDate)}</span>
                          <Badge 
                            variant={
                              reminder.completed ? 'outline' : 
                              reminder.dueDate < Date.now() ? 'destructive' : 'secondary'
                            } 
                            className="ml-2 text-[10px]"
                          >
                            {reminder.completed ? 'Completed' : getTimeRemaining(reminder.dueDate)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No plant care reminders</p>
                    <Button onClick={createReminder} variant="link" size="sm">
                      Create your first reminder
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
