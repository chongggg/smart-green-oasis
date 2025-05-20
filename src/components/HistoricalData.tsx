
import React, { useState, useEffect } from 'react';
import { Database, ref, query, orderByChild, get, limitToLast } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HistoricalDataProps {
  database: Database;
}

export const HistoricalData = ({ database }: HistoricalDataProps) => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<number>(20);  // Default to last 20 records
  const [automationStatus, setAutomationStatus] = useState<boolean>(false);
  
  // Fetch current automation status
  useEffect(() => {
    const automationRef = ref(database, 'settings/automation');
    get(automationRef).then((snapshot) => {
      if (snapshot.exists()) {
        setAutomationStatus(snapshot.val());
        console.log("Automation status:", snapshot.val());
      }
    }).catch(error => {
      console.error("Error fetching automation status:", error);
    });
  }, [database]);
  
  const fetchHistoricalData = async () => {
    try {
      console.log("Fetching historical data with limit:", timeRange);
      
      // When using query with orderByChild and limitToLast, we need to ensure
      // there's a proper index in Firebase rules. For now, we'll use a simpler approach.
      const historyRef = ref(database, 'history');
      
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Raw history data:", data);
        
        if (data) {
          const formattedData = Object.keys(data).map(key => {
            const entry = data[key];
            const date = new Date(entry.timestamp || Date.now());
            return {
              id: key,
              ...entry,
              timestamp: entry.timestamp || Date.now(),
              formattedDate: date.toLocaleDateString(),
              formattedTime: date.toLocaleTimeString(),
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              // Ensure all required fields exist
              temperature: entry.temperature || 0,
              humidity: entry.humidity || 0,
              soil_moisture: entry.soil_moisture || 0,
              lighting: entry.lighting || 0,
              automation_status: entry.automation_status !== undefined ? entry.automation_status : automationStatus
            };
          });
          
          // Sort by timestamp (newest first) and limit to timeRange
          formattedData.sort((a, b) => b.timestamp - a.timestamp);
          const limitedData = formattedData.slice(0, timeRange);
          
          console.log("Formatted history data:", limitedData);
          setHistoryData(limitedData);
        } else {
          console.log("History data is null or empty");
          setHistoryData([]);
        }
      } else {
        console.log("No historical data available");
        setHistoryData([]);
        
        // Simulate data for testing if needed
        // Uncomment this to create test data
        /*
        const testData = Array.from({ length: timeRange }, (_, i) => ({
          id: `test-${i}`,
          timestamp: Date.now() - (i * 60000),
          formattedDate: new Date(Date.now() - (i * 60000)).toLocaleDateString(),
          formattedTime: new Date(Date.now() - (i * 60000)).toLocaleTimeString(),
          time: new Date(Date.now() - (i * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: Math.random() * 10 + 20, // 20-30
          humidity: Math.random() * 30 + 60, // 60-90
          soil_moisture: Math.random() * 40 + 30, // 30-70
          lighting: Math.random() * 50 + 20, // 20-70
          automation_status: i % 3 === 0 ? false : true
        }));
        setHistoryData(testData);
        */
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };
  
  useEffect(() => {
    fetchHistoricalData();
    
    // Set up a refresh interval
    const refreshInterval = setInterval(fetchHistoricalData, 60000); // Refresh every minute
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [database, timeRange]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Historical Data</h1>
        
        <div className="flex gap-2">
          <Button 
            variant={timeRange === 10 ? "default" : "outline"} 
            onClick={() => setTimeRange(10)}
          >
            Last 10
          </Button>
          <Button 
            variant={timeRange === 20 ? "default" : "outline"}
            onClick={() => setTimeRange(20)}
          >
            Last 20
          </Button>
          <Button 
            variant={timeRange === 50 ? "default" : "outline"}
            onClick={() => setTimeRange(50)}
          >
            Last 50
          </Button>
        </div>
      </div>
      
      {/* Current System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={automationStatus ? "default" : "destructive"} className="text-sm py-1 px-3">
              Automation: {automationStatus ? 'Enabled' : 'Disabled'}
            </Badge>
            
            {historyData.length > 0 && (
              <>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Temperature: {historyData[0].temperature?.toFixed(1) || 'N/A'}°C
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Humidity: {historyData[0].humidity?.toFixed(1) || 'N/A'}%
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Soil Moisture: {historyData[0].soil_moisture?.toFixed(1) || 'N/A'}%
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Lighting: {historyData[0].lighting || 'N/A'}%
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...historyData].reverse()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    name="Temperature (°C)"
                    stroke="#ef4444" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No temperature data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Humidity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Humidity History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...historyData].reverse()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    name="Humidity (%)" 
                    stroke="#3b82f6" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No humidity data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Soil Moisture Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Soil Moisture History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...historyData].reverse()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="soil_moisture" 
                    name="Soil Moisture (%)" 
                    stroke="#10b981" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No soil moisture data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Light Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Light Level History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...historyData].reverse()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="lighting" 
                    name="Light Level (%)" 
                    stroke="#f59e0b" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No light level data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Automation Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Status History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...historyData].reverse().map(entry => ({
                    ...entry,
                    automation_status: entry.automation_status ? 100 : 0
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis tickFormatter={(value) => value === 100 ? 'On' : value === 0 ? 'Off' : ''} />
                  <Tooltip formatter={(value) => value === 100 ? 'Enabled' : 'Disabled'} />
                  <Legend />
                  <Line 
                    type="stepAfter" 
                    dataKey="automation_status" 
                    name="Automation" 
                    stroke="#8b5cf6" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No automation status data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Temperature (°C)</TableHead>
                  <TableHead>Humidity (%)</TableHead>
                  <TableHead>Soil Moisture (%)</TableHead>
                  <TableHead>Light (%)</TableHead>
                  <TableHead>Automation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.length > 0 ? historyData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.formattedDate}</TableCell>
                    <TableCell>{entry.formattedTime}</TableCell>
                    <TableCell>{entry.temperature?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.humidity?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.soil_moisture?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.lighting || 'N/A'}</TableCell>
                    <TableCell>
                      {entry.automation_status !== undefined ? (
                        <Badge variant={entry.automation_status ? "default" : "destructive"}>
                          {entry.automation_status ? 'Enabled' : 'Disabled'}
                        </Badge>
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No historical data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
