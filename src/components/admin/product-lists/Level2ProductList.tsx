
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Trash2, Save, X, Filter } from "lucide-react";
import { Level1Product, Level2Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";

interface Level2ProductListProps {
  products: Level2Product[];
  level1Products: Level1Product[];
  onProductUpdate: () => void;
  onEditPartNumbers: (l2Id: string) => void;
}

export const Level2ProductList: React.FC<Level2ProductListProps> = ({
  products,
  level1Products,
  onProductUpdate,
  onEditPartNumbers
}) => {
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Level2Product>>({});
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [chassisTypeFilter, setChassisTypeFilter] = useState<string>('all');

  // Part number config cache per Level 2
  const [pnConfigs, setPnConfigs] = useState<Record<string, any>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries = await Promise.all(
        products.map(async (p) => [p.id, await productDataService.getPartNumberConfig(p.id)] as const)
      );
      if (mounted) setPnConfigs(Object.fromEntries(entries));
    })();
    return () => { mounted = false; };
  }, [products]);

  const handleEditStart = (product: Level2Product) => {
    setEditingProduct(product.id);
    setEditFormData({
      name: product.name,
      parentProductId: product.parentProductId,
      chassisType: product.chassisType || 'N/A',
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      enabled: product.enabled,
      productInfoUrl: product.productInfoUrl || ''
    });
  };

  const handleEditSave = async (productId: string) => {
    try {
      await productDataService.updateLevel2Product(productId, editFormData);
      toast({
        title: "Success",
        description: "Level 2 product updated successfully"
      });
      setEditingProduct(null);
      setEditFormData({});
      onProductUpdate();
    } catch (error) {
      console.error('Error updating Level 2 product:', error);
      toast({
        title: "Error",
        description: "Failed to update Level 2 product",
        variant: "destructive"
      });
    }
  };

  const handleEditCancel = () => {
    setEditingProduct(null);
    setEditFormData({});
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        await productDataService.deleteLevel2Product(productId);
        toast({
          title: "Success",
          description: "Level 2 product deleted successfully"
        });
        onProductUpdate();
      } catch (error) {
        console.error('Error deleting Level 2 product:', error);
        toast({
          title: "Error",
          description: "Failed to delete Level 2 product",
          variant: "destructive"
        });
      }
    }
  };

  const getParentProductName = (parentId: string) => {
    const parent = level1Products.find(p => p.id === parentId);
    return parent ? parent.name : 'Unknown Parent';
  };

  // Filter products by parent Level 1 product and chassis type
  const filteredProducts = products.filter(product => {
    const matchesParent = parentFilter === 'all' || product.parentProductId === parentFilter;
    const matchesChassisType = chassisTypeFilter === 'all' || product.chassisType === chassisTypeFilter;
    return matchesParent && matchesChassisType;
  });

  if (products.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No Level 2 products found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-gray-900">
            Level 2 Products ({filteredProducts.length} of {products.length})
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={parentFilter} onValueChange={setParentFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Filter by Parent Product" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="all" className="text-gray-900">All Parent Products</SelectItem>
                  {level1Products.map((product) => (
                    <SelectItem key={product.id} value={product.id} className="text-gray-900">
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={chassisTypeFilter} onValueChange={setChassisTypeFilter}>
              <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Filter by Chassis Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300">
                <SelectItem value="all" className="text-gray-900">All Chassis Types</SelectItem>
                <SelectItem value="N/A" className="text-gray-900">N/A</SelectItem>
                <SelectItem value="LTX" className="text-gray-900">LTX</SelectItem>
                <SelectItem value="MTX" className="text-gray-900">MTX</SelectItem>
                <SelectItem value="STX" className="text-gray-900">STX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              {editingProduct === product.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`name-${product.id}`} className="text-gray-700">Name *</Label>
                      <Input
                        id={`name-${product.id}`}
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`parent-${product.id}`} className="text-gray-700">Parent Product</Label>
                      <Select
                        value={editFormData.parentProductId || ''}
                        onValueChange={(value) => setEditFormData(prev => ({ ...prev, parentProductId: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder="Select Parent Product" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          {level1Products.map((l1Product) => (
                            <SelectItem key={l1Product.id} value={l1Product.id} className="text-gray-900">
                              {l1Product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div>
                       <Label htmlFor={`chassisType-${product.id}`} className="text-gray-700">Chassis Type</Label>
                       <Select
                         value={editFormData.chassisType || 'N/A'}
                         onValueChange={(value) => setEditFormData(prev => ({ ...prev, chassisType: value }))}
                       >
                         <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                           <SelectValue placeholder="Select Chassis Type" />
                         </SelectTrigger>
                         <SelectContent className="bg-white border-gray-300">
                           <SelectItem value="N/A" className="text-gray-900">N/A (Not a chassis)</SelectItem>
                           <SelectItem value="LTX" className="text-gray-900">LTX</SelectItem>
                           <SelectItem value="MTX" className="text-gray-900">MTX</SelectItem>
                           <SelectItem value="STX" className="text-gray-900">STX</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label htmlFor={`productInfoUrl-${product.id}`} className="text-gray-700">Product Info URL</Label>
                       <Input
                         id={`productInfoUrl-${product.id}`}
                         value={editFormData.productInfoUrl || ''}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, productInfoUrl: e.target.value }))}
                         className="bg-white border-gray-300 text-gray-900"
                         placeholder="https://..."
                       />
                     </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`enabled-${product.id}`}
                        checked={editFormData.enabled || false}
                        onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, enabled: checked }))}
                      />
                      <Label htmlFor={`enabled-${product.id}`} className="text-gray-700">Enabled</Label>
                    </div>
                    <div>
                      <Label htmlFor={`price-${product.id}`} className="text-gray-700">Price ($)</Label>
                      <Input
                        id={`price-${product.id}`}
                        type="number"
                        step="0.01"
                        value={editFormData.price || 0}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`cost-${product.id}`} className="text-gray-700">Cost ($)</Label>
                      <Input
                        id={`cost-${product.id}`}
                        type="number"
                        step="0.01"
                        value={editFormData.cost || 0}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`description-${product.id}`} className="text-gray-700">Description</Label>
                    <Textarea
                      id={`description-${product.id}`}
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditSave(product.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!editFormData.name?.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={handleEditCancel}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-medium text-lg">{product.name}</h4>
                      {product.description && (
                        <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                      )}
                       <div className="flex items-center space-x-2 mt-2">
                         <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                           Chassis: {product.chassisType || 'N/A'}
                         </Badge>
                         <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                           Parent: {getParentProductName(product.parentProductId)}
                         </Badge>
                         <Badge variant={product.enabled ? "default" : "secondary"} 
                                className={product.enabled ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                           {product.enabled ? 'Enabled' : 'Disabled'}
                         </Badge>
                       </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        onClick={() => handleEditStart(product)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => onEditPartNumbers(product.id)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Part Numbers
                      </Button>
                      <Button
                        onClick={() => handleDelete(product.id, product.name)}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="text-gray-500">Price:</span>
                       <span className="text-gray-900 font-medium ml-2">${product.price.toLocaleString()}</span>
                     </div>
                     <div>
                       <span className="text-gray-500">Cost:</span>
                       <span className="text-gray-900 font-medium ml-2">${(product.cost || 0).toLocaleString()}</span>
                     </div>
                     {product.productInfoUrl && (
                       <div className="col-span-2">
                         <span className="text-gray-500">Product Info:</span>
                         <a 
                           href={product.productInfoUrl} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="text-blue-600 hover:text-blue-800 underline ml-2"
                         >
                           View Details
                         </a>
                       </div>
                     )}
                   </div>
                   {pnConfigs[product.id] && (
                     <div className="mt-3 p-3 rounded-md border border-gray-200 bg-white">
                       <div className="text-xs text-gray-500 mb-1">Part Number Preview</div>
                       <div className="grid grid-cols-3 gap-2 text-sm">
                         <div><span className="text-gray-500">Prefix:</span> <span className="text-gray-900 ml-1">{pnConfigs[product.id].prefix}</span></div>
                         <div><span className="text-gray-500">Slots:</span> <span className="text-gray-900 ml-1">{pnConfigs[product.id].slot_count}</span></div>
                         <div><span className="text-gray-500">Separator:</span> <span className="text-gray-900 ml-1">{pnConfigs[product.id].suffix_separator}</span></div>
                         <div><span className="text-gray-500">Remote Off:</span> <span className="text-gray-900 ml-1">{pnConfigs[product.id].remote_off_code}</span></div>
                         <div><span className="text-gray-500">Remote On:</span> <span className="text-gray-900 ml-1">{pnConfigs[product.id].remote_on_code}</span></div>
                         <div className="text-right">
                           <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => onEditPartNumbers(product.id)}>
                             Edit in Part Numbers
                           </Button>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
