
import React, { useEffect, useState } from 'react';
import { Database, ref, onValue, set, push, remove } from 'firebase/database';
import { 
  BellRing, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Trash2,
  Bell,
  CheckCheck,
  Filter,
  PlusCircle,
  Eye,
  EyeOff,
  Save,
  ArrowDownUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

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
  
  // New state for notifications management
  const [showRead, setShowRead] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [filteredType, setFilteredType] = useState<NotificationType | 'all'>('all');
  
  // New state for reminder creation
  const [newReminder, setNewReminder] = useState<{
    title: string;
    description: string;
    dueDate: Date;
  }>({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Tomorrow
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
        variant: type === 'warning' ? 'destructive' : 'default',
      });
    }
  };
  
  // Create a new reminder
  const createReminder = () => {
    // Open in dialog mode now
    setNewReminder({
      title: 'New Plant Care Task',
      description: 'Add description for your plant care task',
      dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Default: tomorrow
    });
  };
  
  // Save the new reminder to Firebase
  const saveNewReminder = () => {
    const reminderData = {
      title: newReminder.title,
      description: newReminder.description,
      dueDate: newReminder.dueDate.getTime(),
      completed: false
    };
    
    const remindersRef = ref(database, 'reminders');
    push(remindersRef, reminderData);
    
    toast({
      title: 'Reminder Created',
      description: 'A new plant care reminder has been added to your schedule'
    });
    
    // Reset form
    setNewReminder({
      title: '',
      description: '',
      dueDate: new Date(Date.now() + (24 * 60 * 60 * 1000)),
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
          <TabsTrigger value="alerts" className="relative">
            <div className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              System Alerts
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-2 absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="relative">
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Plant Care Reminders
              {reminders.filter(r => !r.completed).length > 0 && (
                <Badge variant="secondary" className="ml-2 absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {reminders.filter(r => !r.completed).length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-primary" />
                  System Alerts
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {notifications.filter(n => !n.read).length > 0 && (
                    <Button
                      onClick={markAllAsRead}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                      Mark All Read
                    </Button>
                  )}
                  <Button
                    onClick={() => createSystemAlert('Test Alert', 'This is a test alert', 'info')}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Test Alert
                  </Button>
                </div>
              </div>
              <CardDescription>
                Keep track of important system events and alerts
              </CardDescription>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-read"
                    checked={showRead}
                    onCheckedChange={setShowRead}
                  />
                  <Label htmlFor="show-read" className="text-sm">
                    {showRead ? <Eye className="h-3.5 w-3.5 inline mr-1" /> : <EyeOff className="h-3.5 w-3.5 inline mr-1" />}
                    {showRead ? "Show Read" : "Hide Read"}
                  </Label>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSortNewest(!sortNewest)}
                >
                  <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                  {sortNewest ? "Newest First" : "Oldest First"}
                </Button>
                
                <Select
                  value={filteredType}
                  onValueChange={(value) => setFilteredType(value as NotificationType | 'all')}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {getFilteredNotifications().length > 0 ? (
                  <div className="space-y-4">
                    {getFilteredNotifications().map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border rounded-md p-3 flex gap-3 items-start ${
                          notification.read ? 'bg-muted/20' : 'bg-card'
                        } hover:bg-accent/20 transition-colors`}
                      >
                        {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                        {notification.type === 'info' && <BellRing className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                        {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <Badge variant={
                              notification.type === 'warning' ? 'destructive' : 
                              notification.type === 'success' ? 'success' : 
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
                                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                  Mark as read
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                  <div className="text-center py-12 text-muted-foreground">
                    <BellRing className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No alerts to display</p>
                    {filteredType !== 'all' || !showRead ? (
                      <p className="text-sm mt-1">Try changing your filter settings</p>
                    ) : null}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <div className="text-sm text-muted-foreground">
                Total: {getFilteredNotifications().length} alerts
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="reminders">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Plant Care Reminders
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={createReminder}
                      size="sm"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      New Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Reminder</DialogTitle>
                      <DialogDescription>
                        Add a new plant care reminder to your schedule
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="reminder-title">Title</Label>
                        <Input 
                          id="reminder-title" 
                          value={newReminder.title}
                          onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                          placeholder="Enter reminder title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reminder-description">Description</Label>
                        <Textarea 
                          id="reminder-description"
                          value={newReminder.description}
                          onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                          placeholder="Enter details about this plant care task"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newReminder.dueDate ? format(newReminder.dueDate, 'PPP') : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newReminder.dueDate}
                              onSelect={(date) => date && setNewReminder({...newReminder, dueDate: date})}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>Cancel</Button>
                      <Button 
                        onClick={saveNewReminder}
                        disabled={!newReminder.title || !newReminder.description}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Reminder
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Never forget important plant care tasks with reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {getFilteredReminders().length > 0 ? (
                  <div className="space-y-4">
                    {getFilteredReminders().map((reminder) => (
                      <div 
                        key={reminder.id} 
                        className={`border rounded-md p-3 ${
                          reminder.completed ? 'bg-muted/20' : 
                          reminder.dueDate < Date.now() ? 'bg-destructive/10' : 'bg-card'
                        } hover:bg-accent/20 transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Switch 
                              checked={reminder.completed}
                              onCheckedChange={() => toggleReminderCompletion(reminder.id, reminder.completed)}
                              id={`reminder-${reminder.id}`}
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
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No plant care reminders</p>
                    <Button onClick={createReminder} variant="link" size="sm">
                      Create your first reminder
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <div className="text-sm text-muted-foreground">
                {reminders.filter(r => !r.completed).length} active reminders
              </div>
              <div className="text-sm text-muted-foreground">
                {reminders.filter(r => r.completed).length} completed
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
