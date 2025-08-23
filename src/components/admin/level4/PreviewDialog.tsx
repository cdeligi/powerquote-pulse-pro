import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    type: 'bushing' | 'analog';
    options?: any;
    price?: number;
  } | null;
}

export const PreviewDialog: React.FC<PreviewDialogProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!data) return null;

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const renderBushingPreview = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Bushing Tap Models</h4>
        <div className="mt-2 space-y-2">
          {data.options?.bushingTapModels?.map((model: any) => (
            <div key={model.id} className="bg-muted p-2 rounded-md">
              {model.name}
            </div>
          )) || <p className="text-muted-foreground">No models configured</p>}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium">Inputs</h4>
        <div className="mt-2 space-y-2">
          {data.options?.inputs?.map((input: any, index: number) => (
            <div key={index} className="border p-2 rounded-md">
              <div className="font-medium">Input {index + 1}</div>
              <div className="text-sm text-muted-foreground">
                {input.modelId ? `Model: ${input.modelId}` : 'No model selected'}
              </div>
            </div>
          )) || <p className="text-muted-foreground">No inputs configured</p>}
        </div>
      </div>
    </div>
  );

  const renderAnalogPreview = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Input Types</h4>
        <div className="mt-2 space-y-2">
          {data.options?.inputTypes?.map((type: any) => (
            <div key={type.id} className="bg-muted p-2 rounded-md">
              {type.name} ({type.unit})
            </div>
          )) || <p className="text-muted-foreground">No input types configured</p>}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium">Channels</h4>
        <div className="mt-2 space-y-2">
          {data.options?.inputs?.map((input: any, index: number) => (
            <div key={index} className="border p-2 rounded-md">
              <div className="font-medium">Channel {index + 1}</div>
              <div className="text-sm text-muted-foreground">
                {input.typeId ? `Type: ${input.typeId}` : 'No type selected'}
              </div>
            </div>
          )) || <p className="text-muted-foreground">No channels configured</p>}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuration Preview</DialogTitle>
          <DialogDescription>
            This is how the configuration will appear in the BOM
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{data.displayName} Configuration</CardTitle>
                <Badge variant={data.type === 'bushing' ? 'default' : 'secondary'}>
                  {data.displayName}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.description}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Price</h4>
                    <p>{formatPrice(data.price)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Type</h4>
                    <p>{data.displayName}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  {data.type === 'bushing' ? renderBushingPreview() : renderAnalogPreview()}
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
