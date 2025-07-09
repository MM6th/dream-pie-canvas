import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const birthDataSchema = z.object({
  birth_date: z.string().min(1, 'Birth date is required'),
  birth_time: z.string().min(1, 'Birth time is required'),
  birth_city: z.string().min(1, 'Birth city is required'),
  birth_state: z.string().optional(),
  birth_country: z.string().min(1, 'Birth country is required'),
});

type BirthDataForm = z.infer<typeof birthDataSchema>;

interface BirthDataFormProps {
  onSuccess?: (birthData: any) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const BirthDataForm = ({ onSuccess, onCancel, isModal = false }: BirthDataFormProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<BirthDataForm>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: {
      birth_date: '',
      birth_time: '',
      birth_city: '',
      birth_state: '',
      birth_country: '',
    },
  });

  const geocodeLocation = async (city: string, state: string, country: string) => {
    try {
      setIsGeocoding(true);
      const address = `${city}${state ? ', ' + state : ''}, ${country}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Location not found');
      }

      const location = data[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        timezone: await getTimezone(location.lat, location.lon)
      };
    } catch (error) {
      throw new Error('Unable to geocode location. Please check your city and country.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const getTimezone = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lon}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.zoneName || 'UTC+0';
      }
    } catch (error) {
      console.error('Timezone lookup failed:', error);
    }
    
    // Fallback to UTC
    return 'UTC+0';
  };

  const onSubmit = async (data: BirthDataForm) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save your birth data.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Geocode the location
      const locationData = await geocodeLocation(
        data.birth_city,
        data.birth_state || '',
        data.birth_country
      );

      // Check if user already has birth data
      const { data: existingData } = await supabase
        .from('user_birth_data')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const birthDataPayload = {
        user_id: user.id,
        birth_date: data.birth_date,
        birth_time: data.birth_time,
        birth_city: data.birth_city,
        birth_state: data.birth_state,
        birth_country: data.birth_country,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timezone: locationData.timezone,
      };

      let result;
      if (existingData) {
        // Update existing birth data
        result = await supabase
          .from('user_birth_data')
          .update(birthDataPayload)
          .eq('id', existingData.id)
          .select()
          .single();
      } else {
        // Insert new birth data
        result = await supabase
          .from('user_birth_data')
          .insert(birthDataPayload)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: 'Success',
        description: 'Your birth data has been saved successfully.',
      });

      if (onSuccess) {
        onSuccess(result.data);
      }

    } catch (error) {
      console.error('Error saving birth data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save birth data.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CardWrapper = isModal ? 'div' : Card;
  const CardHeaderWrapper = isModal ? 'div' : CardHeader;
  const CardContentWrapper = isModal ? 'div' : CardContent;

  return (
    <CardWrapper className={isModal ? '' : 'bg-gray-800/50 border-gray-700 backdrop-blur-sm'}>
      <CardHeaderWrapper className={isModal ? 'pb-4' : ''}>
        <CardTitle className="text-white text-xl">Birth Information</CardTitle>
        <p className="text-gray-300 text-sm">
          Please provide your birth details to generate your personalized astrology reading.
        </p>
      </CardHeaderWrapper>
      <CardContentWrapper className={isModal ? '' : 'p-6'}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Birth Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-gray-700 border-gray-600 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Birth Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="bg-gray-700 border-gray-600 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="birth_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Birth City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your birth city"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">State/Province (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter state or province"
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Birth Country</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your birth country"
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting || isGeocoding}
              >
                {isSubmitting ? 'Saving...' : isGeocoding ? 'Geocoding...' : 'Save Birth Data'}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContentWrapper>
    </CardWrapper>
  );
};

export default BirthDataForm;