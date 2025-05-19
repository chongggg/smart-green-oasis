
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

interface HistoricalDataProps {
  database: Database;
}

export const HistoricalData = ({ database }: HistoricalDataProps) => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<number>(20);  // Default to last 20 records
  
  const fetchHistoricalData = async () => {
    try {
      const historyRef = query(
        ref(database, 'history'),
        orderByChild('timestamp'),
        limitToLast(timeRange)
      );
      
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = Object.keys(data).map(key => {
          const entry = data[key];
          const date = new Date(entry.timestamp);
          return {
            id: key,
            ...entry,
            formattedDate: date.toLocaleDateString(),
            formattedTime: date.toLocaleTimeString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
        
        // Sort by timestamp (newest first)
        formattedData.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };
  
  useEffect(() => {
    fetchHistoricalData();
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
          </CardContent>
        </Card>

        {/* Humidity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Humidity History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
          </CardContent>
        </Card>

        {/* Soil Moisture Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Soil Moisture History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
          </CardContent>
        </Card>

        {/* Light Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Light Level History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.formattedDate}</TableCell>
                    <TableCell>{entry.formattedTime}</TableCell>
                    <TableCell>{entry.temperature?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.humidity?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.soil_moisture?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{entry.lighting || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {historyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
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
