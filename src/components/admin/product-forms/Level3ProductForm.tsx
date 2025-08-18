import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Level3Product } from "@/types/product";

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or greater').optional(),
  requires_level4_config: z.boolean().default(false),
  // Add other fields as needed
});

type FormValues = z.infer<typeof formSchema>;

interface Level3ProductFormProps {
  initialData?: Level3Product;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const Level3ProductForm: React.FC<Level3ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      sku: initialData?.sku || '',
      price: initialData?.price,
      requires_level4_config: initialData?.requires_level4_config || false,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter product name"
              error={errors.name?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              {...register('sku')}
              placeholder="Enter SKU"
              error={errors.sku?.message}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              placeholder="Enter price"
              error={errors.price?.message}
            />
          </div>
          <div className="space-y-2">
            {/* Additional fields can go here */}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="requiresLevel4" 
              checked={watch('requires_level4_config')}
              onCheckedChange={(checked) => 
                form.setValue('requires_level4_config', Boolean(checked), { shouldDirty: true })
              }
            />
            <Label htmlFor="requiresLevel4" className="text-sm font-medium leading-none">
              Requires Level 4 Configuration
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Check this if this product needs additional configuration (e.g., analog or bushing card settings)
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </form>
  );
};
