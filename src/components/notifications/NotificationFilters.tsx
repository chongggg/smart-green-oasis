
import React from 'react';
import { Eye, EyeOff, ArrowDownUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationType } from '../Notifications';

interface NotificationFiltersProps {
  showRead: boolean;
  setShowRead: (show: boolean) => void;
  sortNewest: boolean;
  setSortNewest: (sort: boolean) => void;
  filteredType: NotificationType | 'all';
  setFilteredType: (type: NotificationType | 'all') => void;
}

export const NotificationFilters = ({
  showRead,
  setShowRead,
  sortNewest,
  setSortNewest,
  filteredType,
  setFilteredType
}: NotificationFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-3 mt-4 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center space-x-2">
        <Switch
          id="show-read"
          checked={showRead}
          onCheckedChange={setShowRead}
        />
        <Label htmlFor="show-read" className="text-sm flex items-center gap-1">
          {showRead ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showRead ? "Show Read" : "Hide Read"}
        </Label>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 hover:bg-primary/10"
        onClick={() => setSortNewest(!sortNewest)}
      >
        <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
        {sortNewest ? "Newest First" : "Oldest First"}
      </Button>
      
      <Select
        value={filteredType}
        onValueChange={(value) => setFilteredType(value as NotificationType | 'all')}
      >
        <SelectTrigger className="h-8 w-[140px] border-muted">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="warning">⚠️ Warning</SelectItem>
          <SelectItem value="info">ℹ️ Info</SelectItem>
          <SelectItem value="success">✅ Success</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
