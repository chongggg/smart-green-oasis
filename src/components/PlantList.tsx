
import React, { useState, useEffect } from 'react';
import { Database, ref, onValue, remove, update } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlantListProps {
  database: Database;
  toast: any;
}

export const PlantList = ({ database, toast }: PlantListProps) => {
  const [plants, setPlants] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPlantingDate, setEditPlantingDate] = useState('');
  const [editGrowthDuration, setEditGrowthDuration] = useState('');
  const [editCropType, setEditCropType] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  useEffect(() => {
    const plantsRef = ref(database, 'plants');
    const unsubscribe = onValue(plantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const plantsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPlants(plantsArray);
      } else {
        setPlants([]);
      }
    });
    
    return () => unsubscribe();
  }, [database]);
  
  const openEditDialog = (plant: any) => {
    setSelectedPlant(plant);
    setEditName(plant.name);
    setEditPlantingDate(plant.plantingDate);
    setEditGrowthDuration(plant.growthDuration.toString());
    setEditCropType(plant.cropType);
    setIsDialogOpen(true);
  };
  
  const handleUpdatePlant = async () => {
    if (!selectedPlant) return;
    
    try {
      const plantRef = ref(database, `plants/${selectedPlant.id}`);
      await update(plantRef, {
        name: editName,
        plantingDate: editPlantingDate,
        growthDuration: parseInt(editGrowthDuration),
        cropType: editCropType,
        updatedAt: Date.now()
      });
      
      toast({
        title: "Plant Updated",
        description: `${editName} has been updated successfully.`,
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error updating plant:", error);
      toast({
        title: "Error",
        description: "Failed to update plant. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeletePlant = async (plantId: string, plantName: string) => {
    try {
      const plantRef = ref(database, `plants/${plantId}`);
      await remove(plantRef);
      
      toast({
        title: "Plant Deleted",
        description: `${plantName} has been removed from your greenhouse.`,
      });
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const calculatePlantAge = (plantingDate: string) => {
    const planted = new Date(plantingDate).getTime();
    const now = new Date().getTime();
    return Math.floor((now - planted) / (1000 * 60 * 60 * 24));
  };
  
  const calculateGrowthStatus = (plantingDate: string, duration: number) => {
    const age = calculatePlantAge(plantingDate);
    const percent = Math.min(100, Math.round((age / duration) * 100));
    
    if (percent < 33) return "Early Stage";
    if (percent < 66) return "Mid Stage";
    if (percent < 100) return "Late Stage";
    return "Ready for Harvest";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Plant List</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Greenhouse Plants</CardTitle>
        </CardHeader>
        <CardContent>
          {plants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant Name</TableHead>
                    <TableHead>Planting Date</TableHead>
                    <TableHead>Age (Days)</TableHead>
                    <TableHead>Growth Stage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plants.map((plant) => (
                    <TableRow key={plant.id}>
                      <TableCell className="font-medium">{plant.name}</TableCell>
                      <TableCell>{new Date(plant.plantingDate).toLocaleDateString()}</TableCell>
                      <TableCell>{calculatePlantAge(plant.plantingDate)}</TableCell>
                      <TableCell>{calculateGrowthStatus(plant.plantingDate, plant.growthDuration)}</TableCell>
                      <TableCell>{plant.cropType}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(plant)}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {plant.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePlant(plant.id, plant.name)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/50 rounded-md">
              <p className="text-muted-foreground mb-4">No plants in your greenhouse yet</p>
              <Button onClick={() => document.getElementById('add-plant-button')?.click()}>
                Add Your First Plant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plant</DialogTitle>
            <DialogDescription>
              Make changes to your plant information here.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plant-name">Plant Name</Label>
              <Input
                id="plant-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planting-date">Planting Date</Label>
              <Input
                id="planting-date"
                type="date"
                value={editPlantingDate}
                onChange={(e) => setEditPlantingDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="growth-duration">Growth Duration (days)</Label>
              <Input
                id="growth-duration"
                type="number"
                value={editGrowthDuration}
                onChange={(e) => setEditGrowthDuration(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="crop-type">Crop Type</Label>
              <Select value={editCropType} onValueChange={setEditCropType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crop type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leafy">Leafy</SelectItem>
                  <SelectItem value="Fruit">Fruit</SelectItem>
                  <SelectItem value="Root">Root</SelectItem>
                  <SelectItem value="Herb">Herb</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlant}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
