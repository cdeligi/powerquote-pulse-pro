
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
import { Level1Product, AssetType } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";

interface Level1ProductListProps {
  products: Level1Product[];
  onProductUpdate: () => void;
}

export const Level1ProductList: React.FC<Level1ProductListProps> = ({
  products,
  onProductUpdate
}) => {
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Level1Product>>({});
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    const loadAssetTypes = async () => {
      try {
        const types = await productDataService.getAssetTypes();
        setAssetTypes(types.filter(type => type.enabled));
      } catch (error) {
        console.error('Error loading asset types:', error);
      }
    };
    loadAssetTypes();
  }, []);

  const handleEditStart = (product: Level1Product) => {
    setEditingProduct(product.id);
    setEditFormData({
      name: product.name,
      type: product.type,
      asset_type_id: product.asset_type_id,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      enabled: product.enabled
    });
  };

  const handleEditSave = async (productId: string) => {
    try {
      await productDataService.updateLevel1Product(productId, editFormData);
      toast({
        title: "Success",
        description: "Level 1 product updated successfully"
      });
      setEditingProduct(null);
      setEditFormData({});
      onProductUpdate();
    } catch (error) {
      console.error('Error updating Level 1 product:', error);
      toast({
        title: "Error",
        description: "Failed to update Level 1 product",
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
        await productDataService.deleteLevel1Product(productId);
        toast({
          title: "Success",
          description: "Level 1 product deleted successfully"
        });
        onProductUpdate();
      } catch (error) {
        console.error('Error deleting Level 1 product:', error);
        toast({
          title: "Error",
          description: "Failed to delete Level 1 product",
          variant: "destructive"
        });
      }
    }
  };

  // Filter products by asset type
  const filteredProducts = assetTypeFilter === 'all' 
    ? products 
    : products.filter(product => product.asset_type_id === assetTypeFilter);

  if (products.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No Level 1 products found.</p>
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
            Level 1 Products ({filteredProducts.length} of {products.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
              <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Filter by Asset Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300">
                <SelectItem value="all" className="text-gray-900">All Asset Types</SelectItem>
                {assetTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="text-gray-900">
                    {type.name}
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
                      <Label htmlFor={`asset_type_id-${product.id}`} className="text-gray-700">Asset Type</Label>
                      <Select value={editFormData.asset_type_id || ''} onValueChange={(value) => setEditFormData(prev => ({ ...prev, asset_type_id: value }))}>
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          {assetTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id} className="text-gray-900">
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`enabled-${product.id}`}
                      checked={editFormData.enabled || false}
                      onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Label htmlFor={`enabled-${product.id}`} className="text-gray-700">Enabled</Label>
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
                           {assetTypes.find(type => type.id === product.asset_type_id)?.name || product.type}
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
                        onClick={() => handleDelete(product.id, product.name)}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {product.partNumber && (
                    <div className="text-sm">
                      <span className="text-gray-500">Part Number:</span>
                      <span className="text-gray-900 font-medium ml-2">{product.partNumber}</span>
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
