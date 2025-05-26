
import React from 'react';
import { CalendarIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface CreateReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newReminder: {
    title: string;
    description: string;
    dueDate: Date;
  };
  setNewReminder: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    dueDate: Date;
  }>>;
  onSave: () => void;
}

export const CreateReminderDialog = ({
  isOpen,
  onClose,
  newReminder,
  setNewReminder,
  onSave
}: CreateReminderDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-2 shadow-lg">
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
                  className="w-full justify-start text-left font-normal hover:bg-primary/10 transition-colors"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newReminder.dueDate ? format(newReminder.dueDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-2 shadow-lg" align="start">
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={onSave}
            disabled={!newReminder.title || !newReminder.description}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
