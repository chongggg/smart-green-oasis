
import React from 'react';
import { AlertTriangle, BellRing, CheckCircle, Clock, CheckCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notification } from '../Notifications';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

export const NotificationCard = ({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  formatDate 
}: NotificationCardProps) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <BellRing className="h-5 w-5 text-primary" />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'warning':
        return 'bg-destructive/10';
      case 'success':
        return 'bg-green-500/10';
      default:
        return 'bg-primary/10';
    }
  };

  const getBadgeVariant = () => {
    switch (notification.type) {
      case 'warning':
        return 'destructive' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div 
      className={`group border-2 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
        notification.read 
          ? 'bg-muted/20 border-muted' 
          : 'bg-card border-primary/20 shadow-sm'
      }`}
    >
      <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-lg ${getIconBg()}`}>
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            <Badge variant={getBadgeVariant()} className="text-xs px-2 py-1">
              {notification.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(notification.timestamp)}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 hover:bg-primary/10"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Read
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
