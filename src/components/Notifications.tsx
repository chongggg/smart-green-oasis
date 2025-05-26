import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, set, push, remove } from 'firebase/database';
import { 
  BellRing, 
  Calendar as CalendarIcon, 
  Bell,
  CheckCheck,
  PlusCircle,
  Send,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { notificationService } from '@/services/notificationService';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { ReminderCard } from '@/components/notifications/ReminderCard';
import { CreateReminderDialog } from '@/components/notifications/CreateReminderDialog';

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
  
  // State for notifications management
  const [showRead, setShowRead] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [filteredType, setFilteredType] = useState<NotificationType | 'all'>('all');
  
  // State for reminder creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReminder, setNewReminder] = useState<{
    title: string;
    description: string;
    dueDate: Date;
  }>({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)),
  });
  
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
  
  // Create a new system alert with proper external notifications
  const createSystemAlert = async (title: string, message: string, type: NotificationType) => {
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
      
      // Send external notifications (email/SMS) with proper error handling
      try {
        console.log('Sending external notification:', { title, message, type });
        await notificationService.sendNotification(title, message, 'alert');
        
        toast({
          title: 'Alert Sent',
          description: `${title} - External notifications sent successfully`,
          variant: type === 'warning' ? 'destructive' : 'default',
        });
      } catch (error) {
        console.error('Failed to send external notification:', error);
        toast({
          title: title,
          description: `${message} (Note: External notifications may have failed)`,
          variant: type === 'warning' ? 'destructive' : 'default',
        });
      }
    }
  };

  // Enhanced test notification with better error handling
  const sendTestNotification = async () => {
    try {
      console.log('Sending test notification...');
      
      // Create a test alert in the system
      await createSystemAlert(
        'Test Notification', 
        'This is a test notification from your Smart Greenhouse system.', 
        'info'
      );
      
      // Also send direct external notification to ensure it works
      await notificationService.sendNotification(
        'Test Notification',
        'This is a test notification from your Smart Greenhouse system.',
        'alert'
      );
      
      toast({
        title: 'Test Sent Successfully',
        description: 'Check your enabled notification methods (email/SMS) for the test message'
      });
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: 'Test Failed',
        description: 'There was an error sending the test notification. Please check your notification settings.',
        variant: 'destructive'
      });
    }
  };

  // Create a new reminder
  const createReminder = () => {
    setNewReminder({
      title: 'New Plant Care Task',
      description: 'Add description for your plant care task',
      dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)),
    });
    setShowCreateDialog(true);
  };
  
  // Enhanced reminder creation with notifications
  const saveNewReminder = async () => {
    const reminderData = {
      title: newReminder.title,
      description: newReminder.description,
      dueDate: newReminder.dueDate.getTime(),
      completed: false
    };
    
    const remindersRef = ref(database, 'reminders');
    push(remindersRef, reminderData);
    
    // Send reminder notification
    try {
      await notificationService.sendNotification(
        `Reminder Set: ${newReminder.title}`,
        `Due: ${format(newReminder.dueDate, 'PPP')} - ${newReminder.description}`,
        'reminder'
      );
    } catch (error) {
      console.error('Failed to send reminder notification:', error);
    }
    
    toast({
      title: 'Reminder Created',
      description: 'A new plant care reminder has been added and notification sent'
    });
    
    // Reset form and close dialog
    setNewReminder({
      title: '',
      description: '',
      dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)),
    });
    setShowCreateDialog(false);
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
    remove(notificationRef).then(() => {
      toast({
        title: 'Notification Deleted',
        description: 'The notification has been removed'
      });
    });
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    const notificationsToUpdate = notifications.filter(n => !n.read);
    
    if (notificationsToUpdate.length === 0) {
      toast({
        title: 'No Unread Notifications',
        description: 'There are no unread notifications to mark'
      });
      return;
    }
    
    // Update each notification
    notificationsToUpdate.forEach(notification => {
      const notificationRef = ref(database, `notifications/${notification.id}`);
      set(notificationRef, {
        ...notification,
        read: true
      });
    });
    
    toast({
      title: 'All Notifications Marked as Read',
      description: `${notificationsToUpdate.length} notifications updated`
    });
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
    remove(reminderRef).then(() => {
      toast({
        title: 'Reminder Deleted',
        description: 'The plant care reminder has been removed'
      });
    });
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
  
  // Get filtered notifications
  const getFilteredNotifications = () => {
    let filtered = [...notifications];
    
    // Filter by read/unread status
    if (!showRead) {
      filtered = filtered.filter(n => !n.read);
    }
    
    // Filter by type
    if (filteredType !== 'all') {
      filtered = filtered.filter(n => n.type === filteredType);
    }
    
    // Sort by timestamp
    if (sortNewest) {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      filtered.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    return filtered;
  };
  
  // Get filtered and sorted reminders
  const getFilteredReminders = () => {
    let filtered = [...reminders];
    
    // Sort by due date
    filtered.sort((a, b) => a.dueDate - b.dueDate);
    
    return filtered;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Notifications & Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart alerts, reminders, and external notifications
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="notifications-toggle" className="text-sm font-medium">
              System Alerts
            </Label>
            <Switch
              id="notifications-toggle"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>
      </div>
      
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-6 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="alerts" className="relative rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">System Alerts</span>
              <span className="sm:hidden">Alerts</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="relative rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Reminders</span>
              <span className="sm:hidden">Tasks</span>
              {reminders.filter(r => !r.completed).length > 0 && (
                <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {reminders.filter(r => !r.completed).length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts">
          <Card className="border-2 hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BellRing className="h-5 w-5 text-primary" />
                  </div>
                  System Alerts
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {notifications.filter(n => !n.read).length > 0 && (
                    <Button
                      onClick={markAllAsRead}
                      variant="outline"
                      size="sm"
                      className="h-8 hover:bg-primary/10 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                      Mark All Read
                    </Button>
                  )}
                  <Button
                    onClick={sendTestNotification}
                    variant="outline"
                    size="sm"
                    className="h-8 hover:bg-primary/10 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Test Alert
                  </Button>
                </div>
              </div>
              
              <NotificationFilters
                showRead={showRead}
                setShowRead={setShowRead}
                sortNewest={sortNewest}
                setSortNewest={setSortNewest}
                filteredType={filteredType}
                setFilteredType={setFilteredType}
              />
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {getFilteredNotifications().length > 0 ? (
                  <div className="space-y-3">
                    {getFilteredNotifications().map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <BellRing className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-medium mb-2">No alerts to display</h3>
                    <p className="text-sm text-muted-foreground">
                      {filteredType !== 'all' || !showRead ? 
                        'Try adjusting your filter settings' : 
                        'Your greenhouse is running smoothly'
                      }
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="bg-muted/20 rounded-b-lg">
              <div className="flex justify-between items-center w-full text-sm text-muted-foreground">
                <span>Displaying {getFilteredNotifications().length} alerts</span>
                <span>{notifications.filter(n => !n.read).length} unread</span>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="reminders">
          <Card className="border-2 hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  Plant Care Reminders
                </CardTitle>
                <Button
                  onClick={createReminder}
                  size="sm"
                  className="hover:bg-primary/10 transition-colors"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  New Reminder
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {getFilteredReminders().length > 0 ? (
                  <div className="space-y-3">
                    {getFilteredReminders().map((reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onToggleCompletion={toggleReminderCompletion}
                        onDelete={deleteReminder}
                        formatDate={formatDate}
                        getTimeRemaining={getTimeRemaining}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-medium mb-2">No plant care reminders</h3>
                    <Button onClick={createReminder} variant="link" size="sm">
                      Create your first reminder
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="bg-muted/20 rounded-b-lg">
              <div className="flex justify-between items-center w-full text-sm text-muted-foreground">
                <span>{reminders.filter(r => !r.completed).length} active reminders</span>
                <span>{reminders.filter(r => r.completed).length} completed</span>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <NotificationSettings />
        </TabsContent>
      </Tabs>

      <CreateReminderDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        newReminder={newReminder}
        setNewReminder={setNewReminder}
        onSave={saveNewReminder}
      />
    </div>
  );
};
