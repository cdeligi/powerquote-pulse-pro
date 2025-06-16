
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

interface ProductManagementProps {
  user: User;
}

const ProductManagement = ({ user }: ProductManagementProps) => {
  const [activeTab, setActiveTab] = useState("level1");

  // Mock data reflecting the new 3-level hierarchy
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([
    {
      id: 'qtms-main',
      name: 'QTMS',
      type: 'QTMS',
      description: 'Qualitrol Transformer Monitoring System - Complete monitoring solution',
      price: 0, // Base price, actual pricing comes from Level 2/3 selections
      cost: 0,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
      enabled: true,
      partNumber: 'QTMS-BASE-001'
    },
    {
      id: 'tm8-dga',
      name: 'TM8',
      type: 'TM8',
      description: 'Dissolved Gas Analysis Monitor - Standalone DGA solution',
      price: 12500,
      cost: 6250,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
      enabled: true,
      partNumber: 'TM8-DGA-001'
    },
    {
      id: 'qpdm-pd',
      name: 'QPDM',
      type: 'QPDM',
      description: 'Partial Discharge Monitor - Advanced PD detection',
      price: 8500,
      cost: 4250,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
      enabled: true,
      partNumber: 'QPDM-PD-001'
    }
  ]);

  const [level2Products, setLevel2Products] = useState<Level2Product[]>([
    {
      id: 'ltx-chassis',
      name: 'LTX Chassis',
      parentProductId: 'qtms-main',
      type: 'LTX',
      description: 'Large capacity transformer monitoring chassis - 6U, 14 slots',
      price: 4200,
      cost: 2100,
      enabled: true,
      specifications: {
        height: '6U',
        slots: 14,
        capacity: 'Large'
      },
      partNumber: 'LTX-6U-14S'
    },
    {
      id: 'mtx-chassis',
      name: 'MTX Chassis',
      parentProductId: 'qtms-main',
      type: 'MTX',
      description: 'Medium capacity transformer monitoring chassis - 3U, 7 slots',
      price: 2800,
      cost: 1400,
      enabled: true,
      specifications: {
        height: '3U',
        slots: 7,
        capacity: 'Medium'
      },
      partNumber: 'MTX-3U-7S'
    },
    {
      id: 'stx-chassis',
      name: 'STX Chassis',
      parentProductId: 'qtms-main',
      type: 'STX',
      description: 'Compact transformer monitoring chassis - 1.5U, 4 slots',
      price: 1900,
      cost: 950,
      enabled: true,
      specifications: {
        height: '1.5U',
        slots: 4,
        capacity: 'Compact'
      },
      partNumber: 'STX-1.5U-4S'
    },
    {
      id: 'calgas-tm8',
      name: 'CalGas System',
      parentProductId: 'tm8-dga',
      type: 'CalGas',
      description: 'Automated calibration gas system for TM8',
      price: 3500,
      cost: 1750,
      enabled: true,
      partNumber: 'CALGAS-TM8-001'
    },
    {
      id: 'moisture-tm8',
      name: 'Moisture Sensor',
      parentProductId: 'tm8-dga',
      type: 'Moisture',
      description: 'Oil moisture content monitoring for TM8',
      price: 2200,
      cost: 1100,
      enabled: true,
      partNumber: 'MOISTURE-TM8-001'
    }
  ]);

  const [level3Products, setLevel3Products] = useState<Level3Product[]>([
    {
      id: 'relay-8in-2out',
      name: 'Relay Protection Card',
      parentProductId: 'ltx-chassis',
      type: 'relay',
      description: '8 digital inputs + 2 analog outputs for comprehensive protection',
      price: 2500,
      cost: 1250,
      enabled: true,
      specifications: {
        slotRequirement: 1,
        inputs: 8,
        outputs: 2,
        protocols: ['DNP3', 'IEC 61850']
      },
      partNumber: 'RPC-8I2O-001'
    },
    {
      id: 'analog-8ch-ltx',
      name: 'Analog Input Card (LTX)',
      parentProductId: 'ltx-chassis',
      type: 'analog',
      description: '8-channel analog input with configurable input types for LTX',
      price: 1800,
      cost: 900,
      enabled: true,
      specifications: {
        slotRequirement: 1,
        channels: 8,
        inputTypes: ['4-20mA', 'CT', 'RTD', 'Thermocouple']
      },
      partNumber: 'AIC-8CH-LTX-001'
    },
    {
      id: 'analog-8ch-mtx',
      name: 'Analog Input Card (MTX)',
      parentProductId: 'mtx-chassis',
      type: 'analog',
      description: '8-channel analog input with configurable input types for MTX',
      price: 1800,
      cost: 900,
      enabled: true,
      specifications: {
        slotRequirement: 1,
        channels: 8,
        inputTypes: ['4-20mA', 'CT', 'RTD', 'Thermocouple']
      },
      partNumber: 'AIC-8CH-MTX-001'
    },
    {
      id: 'analog-4ch-stx',
      name: 'Analog Input Card (STX)',
      parentProductId: 'stx-chassis',
      type: 'analog',
      description: '4-channel analog input optimized for STX compact chassis',
      price: 1200,
      cost: 600,
      enabled: true,
      specifications: {
        slotRequirement: 1,
        channels: 4,
        inputTypes: ['4-20mA', 'CT', 'RTD']
      },
      partNumber: 'AIC-4CH-STX-001'
    }
  ]);

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

  return (
    <div className="space-y-6">
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
            <Button className="bg-red-600 hover:bg-red-700">
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
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
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
            <Button className="bg-red-600 hover:bg-red-700">
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
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
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
            <Button className="bg-red-600 hover:bg-red-700">
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
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
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
    </div>
  );
};

export default ProductManagement;
