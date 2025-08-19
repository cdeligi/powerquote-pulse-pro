
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Trash2, Save, X, Filter, Settings } from "lucide-react";
import { Level2Product, Level3Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";

interface Level3ProductListProps {
  products: Level3Product[];
  level2Products: Level2Product[];
  onProductUpdate: () => void;
  onEditPartNumbers: (l2Id: string) => void;
}

export const Level3ProductList: React.FC<Level3ProductListProps> = ({
  products,
  level2Products,
  onProductUpdate,
  onEditPartNumbers
}) => {
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Level3Product>>({});
  const [parentFilter, setParentFilter] = useState<string>('all');

  const handleEditStart = (product: Level3Product) => {
    setEditingProduct(product.id);
    setEditFormData({
      name: product.name,
      parentProductId: product.parentProductId,
      type: product.type,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      enabled: product.enabled !== false,
      requires_level4_config: product.requires_level4_config || false
    });
  };

  // Part number codes for current parent filter
  const [parentCodes, setParentCodes] = useState<Record<string, { template: string; slot_span: number }>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (parentFilter === 'all') { setParentCodes({}); return; }
      const codes = await productDataService.getPartNumberCodesForLevel2(parentFilter);
      // Convert array to Record format expected by state
      const codesRecord: Record<string, { template: string; slot_span: number }> = {};
      codes.forEach((code: any) => {
        codesRecord[code.id || code.code] = {
          template: code.template,
          slot_span: code.slot_span || 1
        };
      });
      if (mounted) setParentCodes(codesRecord);
    })();
    return () => { mounted = false; };
  }, [parentFilter]);

  const handleEditSave = async (productId: string) => {
    try {
      await productDataService.updateLevel3Product(productId, editFormData);
      toast({
        title: "Success",
        description: "Level 3 product updated successfully"
      });
      setEditingProduct(null);
      setEditFormData({});
      onProductUpdate();
    } catch (error) {
      console.error('Error updating Level 3 product:', error);
      toast({
        title: "Error",
        description: "Failed to update Level 3 product",
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
        await productDataService.deleteLevel3Product(productId);
        toast({
          title: "Success",
          description: "Level 3 product deleted successfully"
        });
        onProductUpdate();
      } catch (error) {
        console.error('Error deleting Level 3 product:', error);
        toast({
          title: "Error",
          description: "Failed to delete Level 3 product",
          variant: "destructive"
        });
      }
    }
  };

  const getParentProductName = (parentId: string) => {
    const parent = level2Products.find(p => p.id === parentId);
    return parent ? parent.name : 'Unknown Parent';
  };

  // Filter products by parent Level 2 product
  const filteredProducts = parentFilter === 'all' 
    ? products 
    : products.filter(product => product.parentProductId === parentFilter);

  if (products.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No Level 3 products found.</p>
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
            Level 3 Products ({filteredProducts.length} of {products.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={parentFilter} onValueChange={setParentFilter}>
              <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Filter by Parent Product" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300">
                <SelectItem value="all" className="text-gray-900">All Parent Products</SelectItem>
                {level2Products.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-gray-900">
                    {product.name}
                  </SelectItem>
                ))}
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
                          {level2Products.map((l2Product) => (
                            <SelectItem key={l2Product.id} value={l2Product.id} className="text-gray-900">
                              {l2Product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`type-${product.id}`} className="text-gray-700">Display Name</Label>
                      <Input
                        id={`type-${product.id}`}
                        value={editFormData.type || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`enabled-${product.id}`}
                          checked={editFormData.enabled !== false}
                          onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, enabled: checked }))}
                        />
                        <Label htmlFor={`enabled-${product.id}`} className="text-gray-700">Enabled</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`requires-level4-${product.id}`}
                          checked={editFormData.requires_level4_config || false}
                          onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, requires_level4_config: checked }))}
                        />
                        <Label htmlFor={`requires-level4-${product.id}`} className="text-gray-700">Level 4 Configuration</Label>
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
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                          {product.type}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                          Parent: {getParentProductName(product.parentProductId)}
                        </Badge>
                        <Badge variant={product.enabled !== false ? "default" : "secondary"} 
                               className={product.enabled !== false ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                          {product.enabled !== false ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {product.requires_level4_config && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            L4 Enabled
                          </Badge>
                        )}
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
                        onClick={() => onEditPartNumbers(product.parentProductId)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Part Numbers
                      </Button>
                      {product.requires_level4_config && (
                        <Button
                          onClick={() => window.open(`/admin/level4?product=${product.id}`, '_blank')}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
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
                  </div>
                  {parentFilter !== 'all' && (
                    <div className="mt-3 p-3 rounded-md border border-gray-200 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Part Number Template</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Template:</span> <span className="text-gray-900 ml-1">{parentCodes[product.id]?.template || '—'}</span></div>
                        <div><span className="text-gray-500">Slot Span:</span> <span className="text-gray-900 ml-1">{parentCodes[product.id]?.slot_span ?? '—'}</span></div>
                      </div>
                      <div className="text-right mt-2">
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => onEditPartNumbers(product.parentProductId)}>
                          Edit in Part Numbers
                        </Button>
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
