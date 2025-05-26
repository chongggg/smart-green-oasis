
export interface NotificationDeliveryMethod {
  type: 'email' | 'sms' | 'push';
  address: string;
  enabled: boolean;
}

export interface NotificationSettings {
  methods: NotificationDeliveryMethod[];
  enableSystemAlerts: boolean;
  enableReminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export class NotificationService {
  private settings: NotificationSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): NotificationSettings {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      methods: [
        { type: 'email', address: '', enabled: false },
        { type: 'sms', address: '', enabled: false },
        { type: 'push', address: 'browser', enabled: true }
      ],
      enableSystemAlerts: true,
      enableReminders: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  private saveSettings(): void {
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  public updateSettings(newSettings: NotificationSettings): void {
    this.settings = newSettings;
    this.saveSettings();
  }

  public getSettings(): NotificationSettings {
    return this.settings;
  }

  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = this.parseTime(this.settings.quietHours.start);
    const endTime = this.parseTime(this.settings.quietHours.end);
    
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  public async sendNotification(
    title: string,
    message: string,
    type: 'alert' | 'reminder' = 'alert'
  ): Promise<void> {
    if (this.isQuietHours()) {
      console.log('Notification suppressed due to quiet hours');
      return;
    }

    const shouldSend = type === 'alert' ? 
      this.settings.enableSystemAlerts : 
      this.settings.enableReminders;

    if (!shouldSend) return;

    const enabledMethods = this.settings.methods.filter(method => method.enabled);

    for (const method of enabledMethods) {
      try {
        switch (method.type) {
          case 'email':
            await this.sendEmail(method.address, title, message);
            break;
          case 'sms':
            await this.sendSMS(method.address, title, message);
            break;
          case 'push':
            await this.sendPushNotification(title, message);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${method.type} notification:`, error);
      }
    }
  }

  private async sendEmail(email: string, title: string, message: string): Promise<void> {
    // Using EmailJS for client-side email sending
    // In a real app, you'd use a backend service
    const emailData = {
      to_email: email,
      subject: `Greenhouse Alert: ${title}`,
      message: `${title}\n\n${message}\n\nSent from your Smart Greenhouse System`,
      from_name: 'Smart Greenhouse'
    };

    // Simulate email sending (replace with actual service)
    console.log('Sending email:', emailData);
    
    // You can integrate with services like EmailJS, SendGrid, etc.
    // For demo purposes, we'll just log it
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Email sent successfully');
        resolve();
      }, 1000);
    });
  }

  private async sendSMS(phoneNumber: string, title: string, message: string): Promise<void> {
    // Using a service like Twilio for SMS
    const smsData = {
      to: phoneNumber,
      body: `Greenhouse Alert: ${title} - ${message}`
    };

    console.log('Sending SMS:', smsData);
    
    // Simulate SMS sending (replace with actual service)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('SMS sent successfully');
        resolve();
      }, 1000);
    });
  }

  private async sendPushNotification(title: string, message: string): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    }
  }
}

export const notificationService = new NotificationService();
