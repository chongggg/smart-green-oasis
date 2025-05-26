
import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Reminder } from '../Notifications';

interface ReminderCardProps {
  reminder: Reminder;
  onToggleCompletion: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
  getTimeRemaining: (dueTimestamp: number) => string;
}

export const ReminderCard = ({ 
  reminder, 
  onToggleCompletion, 
  onDelete, 
  formatDate, 
  getTimeRemaining 
}: ReminderCardProps) => {
  return (
    <div 
      className={`group border-2 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
        reminder.completed 
          ? 'bg-muted/20 border-muted' 
          : reminder.dueDate < Date.now() 
            ? 'bg-destructive/10 border-destructive/30' 
            : 'bg-card border-primary/20 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Switch 
            checked={reminder.completed}
            onCheckedChange={() => onToggleCompletion(reminder.id, reminder.completed)}
            id={`reminder-${reminder.id}`}
            className="mt-1"
          />
          <div>
            <h4 className={`font-semibold text-sm ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
              {reminder.title}
            </h4>
            <p className={`text-sm text-muted-foreground ${reminder.completed ? 'text-muted-foreground/70' : ''}`}>
              {reminder.description}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(reminder.id)}
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
  );
};
