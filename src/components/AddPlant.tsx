
import React, { useState } from 'react';
import { Database, ref, push } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface AddPlantProps {
  database: Database;
  toast: any;
}

// Define form schema
const formSchema = z.object({
  name: z.string().min(1, 'Plant name is required'),
  plantingDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date',
  }),
  growthDuration: z.coerce.number().positive('Duration must be a positive number'),
  cropType: z.string().min(1, 'Crop type is required'),
});

type FormValues = z.infer<typeof formSchema>;

export const AddPlant = ({ database, toast }: AddPlantProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      plantingDate: new Date().toISOString().split('T')[0], // Today's date as default
      growthDuration: 90, // Now using a number instead of string
      cropType: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Push data to Firebase
      await push(ref(database, 'plants'), {
        name: data.name,
        plantingDate: data.plantingDate,
        growthDuration: data.growthDuration, // Already a number thanks to schema
        cropType: data.cropType,
        createdAt: Date.now()
      });
      
      // Show success message
      toast({
        title: "Plant Added",
        description: `${data.name} has been added to your greenhouse.`,
      });
      
      // Reset form
      form.reset({
        name: '',
        plantingDate: new Date().toISOString().split('T')[0],
        growthDuration: 90, // Now using a number instead of string
        cropType: '',
      });
    } catch (error) {
      console.error("Error adding plant:", error);
      toast({
        title: "Error",
        description: "Failed to add plant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add New Plant</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Plant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Roma Tomato" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the name or variety of your plant.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="plantingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planting Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When was this plant added to your greenhouse?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="growthDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Growth Duration (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many days until expected harvest?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cropType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crop Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select crop type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Leafy">Leafy</SelectItem>
                        <SelectItem value="Fruit">Fruit</SelectItem>
                        <SelectItem value="Root">Root</SelectItem>
                        <SelectItem value="Herb">Herb</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of crop you're growing.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Plant"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
