import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  Layers, 
  Settings,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { User } from "@/types/auth";
import { Level1Product, Level2Product, Level3Product } from "@/types/product";
import Level1ProductForm from "./product-forms/Level1ProductForm";
import Level2OptionForm from "./product-forms/Level2OptionForm";
import CardForm from "./product-forms/CardForm";
import { useToast } from "@/hooks/use-toast";
import { productDataService } from "@/services/productDataService";
import AnalogDefaultsDialog from "./defaults/AnalogDefaultsDialog";
import BushingDefaultsDialog from "./defaults/BushingDefaultsDialog";

interface ProductManagementProps {
  user: User;
}

const ProductManagement = ({ user }: ProductManagementProps) => {
  const [activeTab, setActiveTab] = useState("level1");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'level1' | 'level2' | 'level3'>('level1');
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsProduct, setSettingsProduct] = useState<Level3Product | null>(null);
  const [settingsType, setSettingsType] = useState<'analog' | 'bushing' | null>(null);
  const { toast } = useToast();

  // Use productDataService instead of local state
  const level1Products = productDataService.getLevel1Products();
  const level2Products = productDataService.getLevel2Products();
  const level3Products = productDataService.getLevel3Products();

  // Helper functions
  const getLevel2ProductsForLevel1 = (level1Id: string) => {
    return level2Products.filter(p => p.parentProductId === level1Id);
  };

  const getLevel3ProductsForLevel2 = (level2Id: string) => {
    return level3Products.filter(p => p.parentProductId === level2Id);
  };

  const getParentProduct = (parentId: string, level: number) => {
    if (level === 2) {
      return level1Products.find(p => p.id === parentId);
    }
    if (level === 3) {
      return level2Products.find(p => p.id === parentId);
    }
    return null;
  };

  const getGrandParentProduct = (level2Product: Level2Product) => {
    return level1Products.find(p => p.id === level2Product.parentProductId);
  };

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // CRUD Operations
  const handleCreateLevel1Product = async (productData: Omit<Level1Product, 'id'>) => {
    await productDataService.createLevel1Product(productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 1 product created successfully"
    });
  };

  const handleUpdateLevel1Product = async (productData: Omit<Level1Product, 'id'>) => {
    if (!editingProduct) return;
    await productDataService.updateLevel1Product(editingProduct.id, productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 1 product updated successfully"
    });
  };

  const handleDeleteLevel1Product = async (productId: string) => {
    // Check for dependencies
    const dependentLevel2 = level2Products.filter(p => p.parentProductId === productId);
    if (dependentLevel2.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This product has ${dependentLevel2.length} dependent Level 2 products. Please remove them first.`,
        variant: "destructive"
      });
      return;
    }
    
    await productDataService.deleteLevel1Product(productId);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 1 product deleted successfully"
    });
  };

  const handleCreateLevel2Product = async (productData: Omit<Level2Product, 'id'>) => {
    await productDataService.createLevel2Product(productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 2 product created successfully"
    });
  };

  const handleUpdateLevel2Product = async (productData: Omit<Level2Product, 'id'>) => {
    if (!editingProduct) return;
    await productDataService.updateLevel2Product(editingProduct.id, productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 2 product updated successfully"
    });
  };

  const handleDeleteLevel2Product = async (productId: string) => {
    // Check for dependencies
    const dependentLevel3 = level3Products.filter(p => p.parentProductId === productId);
    if (dependentLevel3.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This product has ${dependentLevel3.length} dependent Level 3 products. Please remove them first.`,
        variant: "destructive"
      });
      return;
    }
    
    await productDataService.deleteLevel2Product(productId);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 2 product deleted successfully"
    });
  };

  const handleCreateLevel3Product = async (productData: Omit<Level3Product, 'id'>) => {
    await productDataService.createLevel3Product(productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 3 product created successfully"
    });
  };

  const handleUpdateLevel3Product = async (productData: Omit<Level3Product, 'id'>) => {
    if (!editingProduct) return;
    await productDataService.updateLevel3Product(editingProduct.id, productData);
    setDialogOpen(false);
    setEditingProduct(null);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 3 product updated successfully"
    });
  };

  const handleDeleteLevel3Product = async (productId: string) => {
    await productDataService.deleteLevel3Product(productId);
    forceRefresh();
    toast({
      title: "Success",
      description: "Level 3 product deleted successfully"
    });
  };

  const openEditDialog = (product: any, type: 'level1' | 'level2' | 'level3') => {
    setEditingProduct(product);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openCreateDialog = (type: 'level1' | 'level2' | 'level3') => {
    setEditingProduct(null);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openSettingsDialog = (product: Level3Product) => {
    if (product.name.toLowerCase().includes('analog')) {
      setSettingsType('analog');
      setSettingsProduct(product);
    } else if (product.name.toLowerCase().includes('bushing')) {
      setSettingsType('bushing');
      setSettingsProduct(product);
    }
  };

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Catalog Management</h2>
          <p className="text-gray-400">Manage your 3-level product hierarchy: Categories → Variants → Components</p>
        </div>
        <Badge variant="outline" className="border-green-600 text-green-400">
          {level1Products.length + level2Products.length + level3Products.length} Total Products
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger 
            value="level1" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            Level 1: Categories ({level1Products.length})
          </TabsTrigger>
          <TabsTrigger 
            value="level2" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Layers className="h-4 w-4 mr-2" />
            Level 2: Variants ({level2Products.length})
          </TabsTrigger>
          <TabsTrigger 
            value="level3" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Level 3: Components ({level3Products.length})
          </TabsTrigger>
        </TabsList>

        {/* Level 1 Products */}
        <TabsContent value="level1" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-medium text-white">Level 1: Main Product Categories</h3>
              <p className="text-gray-400">Core product families (QTMS, TM8, QPDM, etc.)</p>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => openCreateDialog('level1')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Level 1 Product
            </Button>
          </div>

          <div className="grid gap-4">
            {level1Products.map((product) => {
              const level2Count = getLevel2ProductsForLevel1(product.id).length;
              const level3Count = getLevel2ProductsForLevel1(product.id)
                .reduce((count, l2) => count + getLevel3ProductsForLevel2(l2.id).length, 0);
              
              return (
                <Card key={product.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          {product.name}
                          <ChevronRight className="h-4 w-4 mx-2 text-gray-500" />
                          <span className="text-sm text-gray-400">{level2Count} variants</span>
                          <ChevronRight className="h-4 w-4 mx-2 text-gray-500" />
                          <span className="text-sm text-gray-400">{level3Count} components</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {product.description}
                        </CardDescription>
                        <div className="flex items-center space-x-2 mt-2">
                          {product.type && (
                            <Badge variant="outline" className="text-xs">
                              {product.type}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {product.partNumber}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={product.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                          >
                            {product.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => openEditDialog(product, 'level1')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteLevel1Product(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Base Price</p>
                        <p className="text-white font-medium">${product.price.toLocaleString()}</p>
                      </div>
                      {user.role === 'admin' && product.cost !== undefined && (
                        <div>
                          <p className="text-gray-400">Base Cost</p>
                          <p className="text-white font-medium">${product.cost.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400">Level 2 Variants</p>
                        <p className="text-white font-medium">{level2Count}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Level 3 Components</p>
                        <p className="text-white font-medium">{level3Count}</p>
                      </div>
                    </div>
                    {product.productInfoUrl && (
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => window.open(product.productInfoUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Product Info
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Level 2 Products */}
        <TabsContent value="level2" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-medium text-white">Level 2: Product Variants</h3>
              <p className="text-gray-400">Chassis types, options, and variants (LTX/MTX/STX, CalGas, etc.)</p>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => openCreateDialog('level2')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Level 2 Product
            </Button>
          </div>

          <div className="grid gap-4">
            {level2Products.map((product) => {
              const parentProduct = getParentProduct(product.parentProductId, 2) as Level1Product;
              const level3Count = getLevel3ProductsForLevel2(product.id).length;
              
              return (
                <Card key={product.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <span className="text-gray-400 text-sm mr-2">
                            {parentProduct?.name} →
                          </span>
                          {product.name}
                          <ChevronRight className="h-4 w-4 mx-2 text-gray-500" />
                          <span className="text-sm text-gray-400">{level3Count} components</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {product.description}
                        </CardDescription>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {product.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {product.partNumber}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={product.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                          >
                            {product.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => openEditDialog(product, 'level2')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteLevel2Product(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Price</p>
                        <p className="text-white font-medium">${product.price.toLocaleString()}</p>
                      </div>
                      {user.role === 'admin' && product.cost !== undefined && (
                        <div>
                          <p className="text-gray-400">Cost</p>
                          <p className="text-white font-medium">${product.cost.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400">Parent Product</p>
                        <p className="text-white font-medium">{parentProduct?.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Components</p>
                        <p className="text-white font-medium">{level3Count}</p>
                      </div>
                    </div>
                    {product.specifications && (
                      <div className="mt-4">
                        <p className="text-gray-400 text-xs mb-2">Specifications:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(product.specifications).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Level 3 Products */}
        <TabsContent value="level3" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-medium text-white">Level 3: Components & Cards</h3>
              <p className="text-gray-400">Individual cards, sensors, and components for specific variants</p>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => openCreateDialog('level3')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Level 3 Component
            </Button>
          </div>

          <div className="grid gap-4">
            {level3Products.map((product) => {
              const parentProduct = getParentProduct(product.parentProductId, 3) as Level2Product;
              const grandParentProduct = parentProduct ? getGrandParentProduct(parentProduct) : null;
              
              return (
                <Card key={product.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <span className="text-gray-400 text-sm mr-2">
                            {grandParentProduct?.name} → {parentProduct?.name} →
                          </span>
                          {product.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {product.description}
                        </CardDescription>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {product.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {product.partNumber}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={product.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                          >
                            {product.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => openEditDialog(product, 'level3')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {(product.name.toLowerCase().includes('analog') || product.name.toLowerCase().includes('bushing')) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-gray-200"
                            onClick={() => openSettingsDialog(product)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteLevel3Product(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Price</p>
                        <p className="text-white font-medium">${product.price.toLocaleString()}</p>
                      </div>
                      {user.role === 'admin' && product.cost !== undefined && (
                        <div>
                          <p className="text-gray-400">Cost</p>
                          <p className="text-white font-medium">${product.cost.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400">Parent Variant</p>
                        <p className="text-white font-medium">{parentProduct?.name}</p>
                      </div>
                    </div>
                    {product.specifications && (
                      <div className="mt-4">
                        <p className="text-gray-400 text-xs mb-2">Specifications:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(product.specifications).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {Array.isArray(value) ? value.join(', ') : value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? 'Edit' : 'Create'} {
                dialogType === 'level1' ? 'Level 1 Product' :
                dialogType === 'level2' ? 'Level 2 Product' :
                'Level 3 Product'
              }
            </DialogTitle>
          </DialogHeader>
          
          {dialogType === 'level1' && (
            <Level1ProductForm
              onSubmit={editingProduct ? handleUpdateLevel1Product : handleCreateLevel1Product}
              initialData={editingProduct}
            />
          )}
          
          {dialogType === 'level2' && (
            <Level2OptionForm
              onSubmit={editingProduct ? handleUpdateLevel2Product : handleCreateLevel2Product}
              level1Products={level1Products}
              initialData={editingProduct}
            />
          )}
          
          {dialogType === 'level3' && (
            <CardForm
              onSubmit={editingProduct ? handleUpdateLevel3Product : handleCreateLevel3Product}
              level2Products={level2Products}
              initialData={editingProduct}
            />
          )}
        </DialogContent>
      </Dialog>

      {settingsProduct && settingsType === 'analog' && (
        <AnalogDefaultsDialog
          product={settingsProduct}
          onClose={() => {
            setSettingsProduct(null);
            setSettingsType(null);
          }}
        />
      )}

      {settingsProduct && settingsType === 'bushing' && (
        <BushingDefaultsDialog
          product={settingsProduct}
          onClose={() => {
            setSettingsProduct(null);
            setSettingsType(null);
          }}
        />
      )}
    </div>
  );
};

export default ProductManagement;
