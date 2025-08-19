import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, GripVertical } from "lucide-react";
import { productDataService } from "@/services/productDataService";
import { Level1Product, Level2Product, Level3Product, BOMItem } from "@/types/product/interfaces";

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
  canSeeCosts: boolean;
}

export default function BOMBuilder({ onBOMUpdate, canSeePrices, canSeeCosts }: BOMBuilderProps) {
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [chassisOptions, setChassisOptions] = useState<Level2Product[]>([]);
  
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");
  const [selectedChassis, setSelectedChassis] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [isBOMDirty, setIsBOMDirty] = useState(false);

  const loadData = async () => {
    try {
      const [l1Products, chassis] = await Promise.all([
        productDataService.getLevel1Products(),
        productDataService.getChassisOptions()
      ]);
      setLevel1Products(l1Products);
      setChassisOptions(chassis);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load product data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLevel2Products = level2Products.filter(
    product => product.parentProductId === selectedLevel1
  );

  const filteredLevel3Products = level3Products.filter(
    product => product.parentProductId === selectedLevel2
  );

  const handleLevel1Change = async (value: string) => {
    setSelectedLevel1(value);
    setSelectedLevel2("");
    setSelectedLevel3("");
    
    try {
      const l2Products = await productDataService.getLevel2ProductsForLevel1(value);
      setLevel2Products(l2Products);
      setLevel3Products([]);
    } catch (error) {
      console.error("Error loading Level 2 products:", error);
      toast.error("Failed to load Level 2 products");
    }
  };

  const handleLevel2Change = async (value: string) => {
    setSelectedLevel2(value);
    setSelectedLevel3("");
    
    try {
      const l3Products = await productDataService.getLevel3ProductsForLevel2(value);
      setLevel3Products(l3Products);
    } catch (error) {
      console.error("Error loading Level 3 products:", error);
      toast.error("Failed to load Level 3 products");
    }
  };

  const addCardToSlot = (card: Level3Product, slot?: number) => {
    const existingItem = bomItems.find(
      item => item.product.id === card.id && item.slot === slot
    );

    if (existingItem) {
      setBomItems(items =>
        items.map(item =>
          item.product.id === card.id && item.slot === slot
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      const newItem: BOMItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        product: card,
        quantity,
        enabled: true,
        slot,
        partNumber: card.partNumber,
        configuration: {}
      };
      setBomItems(items => [...items, newItem]);
    }
    setIsBOMDirty(true);
  };

  const handleCardSelect = (cardId: string) => {
    const card = level3Products.find(p => p.id === cardId);
    if (!card) return;

    addCardToSlot(card);
    toast.success("Card added to BOM");
  };

  const handleSaveBOM = () => {
    onBOMUpdate(bomItems);
    setIsBOMDirty(false);
    toast.success("BOM saved successfully");
  };

  const handleRemoveItem = (id: string) => {
    setBomItems(items => items.filter(item => item.id !== id));
    setIsBOMDirty(true);
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setBomItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
    setIsBOMDirty(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="level1">Level 1 Product</Label>
              <Select value={selectedLevel1} onValueChange={handleLevel1Change}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level 1 Product" />
                </SelectTrigger>
                <SelectContent>
                  {level1Products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="level2">Level 2 Product</Label>
              <Select 
                value={selectedLevel2} 
                onValueChange={handleLevel2Change}
                disabled={!selectedLevel1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Level 2 Product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLevel2Products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="level3">Level 3 Product</Label>
              <Select 
                value={selectedLevel3} 
                onValueChange={setSelectedLevel3}
                disabled={!selectedLevel2}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Level 3 Product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLevel3Products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => selectedLevel3 && handleCardSelect(selectedLevel3)}
              disabled={!selectedLevel3}
            >
              Add to BOM
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BOM Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {bomItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No items in BOM. Add products to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {bomItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.product.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id!, parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                      {canSeePrices && (
                        <span className="text-sm font-medium">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {isBOMDirty && bomItems.length > 0 && (
            <div className="mt-4">
              <Separator className="mb-4" />
              <Button onClick={handleSaveBOM} className="w-full">
                Save BOM
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}