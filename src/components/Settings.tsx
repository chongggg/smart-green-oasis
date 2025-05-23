
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, 
  Moon, 
  Code, 
  Wrench, 
  HeadphonesIcon, 
  Github,
  Mail,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

const teamMembers = [
  {
    name: "John Clarence M. Miranda",
    role: "Software Developer",
    initials: "JM",
    description: "Lead software developer responsible for system architecture and application development.",
    specialty: "Full-Stack Development",
    contact: "jmiranda@example.com",
    github: "jcmiranda"
  },
  {
    name: "Piolo Alba",
    role: "Hardware Developer",
    initials: "PA",
    description: "Hardware engineering expert, designed and built the ESP32-based sensor and actuator systems.",
    specialty: "Embedded Systems",
    contact: "palba@example.com",
    github: "pioloalba"
  },
  {
    name: "Jericson Villanueva",
    role: "Support",
    initials: "JV",
    description: "Technical support engineer providing user assistance and system maintenance.",
    specialty: "User Support",
    contact: "jvillanueva@example.com",
    github: "jericsonv"
  },
  {
    name: "Kendrick Celemen",
    role: "Support",
    initials: "KC",
    description: "System administrator assisting with deployment and cloud infrastructure.",
    specialty: "Cloud Infrastructure",
    contact: "kcelemen@example.com",
    github: "kendrickc"
  },
  {
    name: "Joshua Yaptangco",
    role: "Support",
    initials: "JY",
    description: "Documentation specialist and quality assurance tester for the system.",
    specialty: "QA Testing",
    contact: "jyaptangco@example.com",
    github: "joshuay"
  }
];

export const Settings = ({ isDarkMode, setIsDarkMode }: SettingsProps) => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the Smart Greenhouse application looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark theme
              </p>
            </div>
            <Switch 
              id="dark-mode" 
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Development Team
          </CardTitle>
          <CardDescription>
            Meet the team behind the Smart Greenhouse IoT System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {teamMembers.map((member, index) => (
            <div key={member.name}>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <h3 className="font-medium">{member.name}</h3>
                    <Badge variant={member.role === "Software Developer" ? "default" : 
                           member.role === "Hardware Developer" ? "secondary" : "outline"}>
                      {member.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.description}</p>
                  <div className="flex flex-wrap gap-4 pt-1 text-sm">
                    <div className="flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{member.specialty}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`mailto:${member.contact}`} className="hover:underline text-primary">
                        {member.contact}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Github className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        @{member.github}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              {index < teamMembers.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-medium">Smart Greenhouse IoT System</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Version 1.0.0</span>
                <Badge variant="outline">Beta</Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              This system monitors and controls your greenhouse environment using ESP32 and Firebase.
              Monitor temperature, humidity, soil moisture, and lighting conditions in real-time.
              Control actuators and automate your greenhouse environment for optimal plant growth.
            </p>
            
            <div className="pt-2 space-y-2">
              <h4 className="text-sm font-medium">Features:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                <li>Real-time environment monitoring</li>
                <li>Automated climate control</li>
                <li>Smart watering system</li>
                <li>Plant growth analytics</li>
                <li>Mobile responsive dashboard</li>
                <li>Customizable alerts and notifications</li>
              </ul>
            </div>
            
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <HeadphonesIcon className="h-4 w-4" />
                Get Support
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Visit Website
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
