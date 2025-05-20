
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { Database } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database as DatabaseIcon } from 'lucide-react';

interface DataTableProps {
  database: Database;
  path: string;
}

export const DataTable = ({ database, path }: DataTableProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const dataRef = ref(database, path);
    
    try {
      const unsubscribe = onValue(dataRef, (snapshot) => {
        const rawData = snapshot.val();
        console.log(`Data from ${path}:`, rawData); // Add logging for debugging
        setLoading(false);
        setData(rawData);
      }, (error) => {
        console.error(`Error fetching data from ${path}:`, error);
        setError(error.message);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up database listener:", err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [database, path]);

  // Function to render different data types
  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? 
        <span className="text-green-500 font-medium">Yes</span> : 
        <span className="text-red-500 font-medium">No</span>;
    }
    
    if (typeof value === 'number') {
      // Check if it's a timestamp
      if (value > 1000000000000) { // Simple check for timestamp (milliseconds)
        return new Date(value).toLocaleString();
      }
      return value.toString();
    }
    
    if (typeof value === 'object') {
      return (
        <div className="border p-2 rounded bg-muted/20 max-h-[100px] overflow-auto">
          <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }
    
    return String(value);
  };

  // Function to render a simple key-value table for objects
  const renderKeyValueTable = (data: Record<string, any>) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>{renderValue(value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <DatabaseIcon className="h-5 w-5" />
          {path}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center">Loading data...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">Error: {error}</div>
        ) : data === null ? (
          <div className="py-10 text-center">No data available</div>
        ) : typeof data === 'object' && data !== null ? (
          renderKeyValueTable(data)
        ) : (
          <div className="py-4">{renderValue(data)}</div>
        )}
      </CardContent>
    </Card>
  );
};
