
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  Cpu, 
  Monitor, 
  Settings,
  Upload,
  ExternalLink
} from "lucide-react";
import { User } from "@/types/auth";
import { Chassis, Card as ProductCard, Level1Product, Level2Option } from "@/types/product";
import ChassisForm from "./product-forms/ChassisForm";
import CardForm from "./product-forms/CardForm";
import Level1ProductForm from "./product-forms/Level1ProductForm";
import Level2OptionForm from "./product-forms/Level2OptionForm";

interface ProductManagementProps {
  user: User;
}

const ProductManagement = ({ user }: ProductManagementProps) => {
  const [activeTab, setActiveTab] = useState("chassis");

  // Mock data - in a real app, this would come from a database
  const [chassisData, setChassisData] = useState<Chassis[]>([
    {
      id: 'ltx-chassis',
      name: 'LTX Chassis',
      type: 'LTX',
      height: '6U • 14 slots',
      slots: 14,
      price: 4200,
      cost: 2100,
      description: 'Large capacity transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/ltx-chassis',
      partNumber: 'LTX-6U-14S',
      enabled: true
    },
    {
      id: 'mtx-chassis',
      name: 'MTX Chassis',
      type: 'MTX',
      height: '3U • 7 slots',
      slots: 7,
      price: 2800,
      cost: 1400,
      description: 'Medium capacity transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/mtx-chassis',
      partNumber: 'MTX-3U-7S',
      enabled: true
    },
    {
      id: 'stx-chassis',
      name: 'STX Chassis',
      type: 'STX',
      height: '1.5U • 4 slots',
      slots: 4,
      price: 1900,
      cost: 950,
      description: 'Compact transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/stx-chassis',
      partNumber: 'STX-1.5U-4S',
      enabled: true
    }
  ]);

  const [cardsData, setCardsData] = useState<ProductCard[]>([
    {
      id: 'relay-8in-2out',
      name: 'Relay Protection Card',
      type: 'relay',
      description: '8 digital inputs + 2 analog outputs for comprehensive protection',
      price: 2500,
      cost: 1250,
      slotRequirement: 1,
      compatibleChassis: ['ltx-chassis', 'mtx-chassis', 'stx-chassis'],
      specifications: {
        inputs: 8,
        outputs: 2,
        protocols: ['DNP3', 'IEC 61850']
      },
      partNumber: 'RPC-8I2O-001',
      enabled: true
    },
    {
      id: 'analog-8ch',
      name: 'Analog Input Card',
      type: 'analog',
      description: '8-channel analog input with configurable input types',
      price: 1800,
      cost: 900,
      slotRequirement: 1,
      compatibleChassis: ['ltx-chassis', 'mtx-chassis', 'stx-chassis'],
      specifications: {
        channels: 8,
        inputTypes: ['4-20mA', 'CT', 'RTD', 'Thermocouple']
      },
      partNumber: 'AIC-8CH-001',
      enabled: true
    }
  ]);

  const [level1Products, setLevel1Products] = useState<Level1Product[]>([
    {
      id: 'tm8-dga',
      name: 'TM8',
      type: 'TM8',
      description: 'Dissolved Gases (9 gases)',
      price: 12500,
      cost: 6250,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
      enabled: true,
      customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor'],
      partNumber: 'TM8-DGA-001'
    },
    {
      id: 'qpdm-pd',
      name: 'QPDM',
      type: 'QPDM',
      description: 'Partial Discharge Monitor',
      price: 8500,
      cost: 4250,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
      enabled: true,
      partNumber: 'QPDM-PD-001'
    }
  ]);

  const [level2Options, setLevel2Options] = useState<Level2Option[]>([
    {
      id: 'calgas-tm8',
      name: 'CalGas Calibration System',
      parentProductId: 'tm8-dga',
      description: 'Automated calibration gas system',
      price: 3500,
      cost: 1750,
      enabled: true
    },
    {
      id: 'moisture-tm8',
      name: 'Moisture Sensor',
      parentProductId: 'tm8-dga',
      description: 'Oil moisture content monitoring',
      price: 2200,
      cost: 1100,
      enabled: true
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Management</h2>
          <p className="text-gray-400">Manage your product catalog and pricing</p>
        </div>
        <Badge variant="outline" className="border-green-600 text-green-400">
          {chassisData.length + cardsData.length + level1Products.length} Products
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger 
            value="chassis" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            Chassis ({chassisData.length})
          </TabsTrigger>
          <TabsTrigger 
            value="cards" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Cpu className="h-4 w-4 mr-2" />
            Cards ({cardsData.length})
          </TabsTrigger>
          <TabsTrigger 
            value="level1" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Level 1 ({level1Products.length})
          </TabsTrigger>
          <TabsTrigger 
            value="level2" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Level 2 ({level2Options.length})
          </TabsTrigger>
        </TabsList>

        {/* Chassis Management */}
        <TabsContent value="chassis" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-medium text-white">Chassis Products</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chassis
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Chassis</DialogTitle>
                </DialogHeader>
                <ChassisForm 
                  onSubmit={(chassis) => {
                    setChassisData([...chassisData, { ...chassis, id: `chassis-${Date.now()}` }]);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {chassisData.map((chassis) => (
              <Card key={chassis.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{chassis.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {chassis.description}
                      </CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {chassis.height}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {chassis.partNumber}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={chassis.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                        >
                          {chassis.enabled ? "Enabled" : "Disabled"}
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
                      <p className="text-white font-medium">${chassis.price.toLocaleString()}</p>
                    </div>
                    {user.role === 'admin' && chassis.cost && (
                      <div>
                        <p className="text-gray-400">Cost</p>
                        <p className="text-white font-medium">${chassis.cost.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Slots</p>
                      <p className="text-white font-medium">{chassis.slots}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Type</p>
                      <p className="text-white font-medium">{chassis.type}</p>
                    </div>
                  </div>
                  {chassis.productInfoUrl && (
                    <div className="mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => window.open(chassis.productInfoUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Product Info
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cards Management */}
        <TabsContent value="cards" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-medium text-white">Card Products</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Card</DialogTitle>
                </DialogHeader>
                <CardForm 
                  chassisOptions={chassisData}
                  onSubmit={(card) => {
                    setCardsData([...cardsData, { ...card, id: `card-${Date.now()}` }]);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {cardsData.map((card) => (
              <Card key={card.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{card.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {card.description}
                      </CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {card.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {card.partNumber}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={card.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                        >
                          {card.enabled ? "Enabled" : "Disabled"}
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
                      <p className="text-white font-medium">${card.price.toLocaleString()}</p>
                    </div>
                    {user.role === 'admin' && card.cost && (
                      <div>
                        <p className="text-gray-400">Cost</p>
                        <p className="text-white font-medium">${card.cost.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Slot Requirement</p>
                      <p className="text-white font-medium">{card.slotRequirement}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Compatible Chassis</p>
                      <p className="text-white font-medium">{card.compatibleChassis.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Level 1 Products Management */}
        <TabsContent value="level1" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-medium text-white">Level 1 Products</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level 1 Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Level 1 Product</DialogTitle>
                </DialogHeader>
                <Level1ProductForm 
                  onSubmit={(product) => {
                    setLevel1Products([...level1Products, { ...product, id: `l1-${Date.now()}` }]);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {level1Products.map((product) => (
              <Card key={product.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{product.name}</CardTitle>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Price</p>
                      <p className="text-white font-medium">${product.price.toLocaleString()}</p>
                    </div>
                    {user.role === 'admin' && product.cost && (
                      <div>
                        <p className="text-gray-400">Cost</p>
                        <p className="text-white font-medium">${product.cost.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Customizations</p>
                      <p className="text-white font-medium">
                        {product.customizations ? product.customizations.length : 0}
                      </p>
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
            ))}
          </div>
        </TabsContent>

        {/* Level 2 Options Management */}
        <TabsContent value="level2" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-medium text-white">Level 2 Options</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level 2 Option
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Level 2 Option</DialogTitle>
                </DialogHeader>
                <Level2OptionForm 
                  level1Products={level1Products}
                  onSubmit={(option) => {
                    setLevel2Options([...level2Options, { ...option, id: `l2-${Date.now()}` }]);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {level2Options.map((option) => (
              <Card key={option.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{option.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {option.description}
                      </CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Parent: {level1Products.find(p => p.id === option.parentProductId)?.name}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={option.enabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}
                        >
                          {option.enabled ? "Enabled" : "Disabled"}
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Price</p>
                      <p className="text-white font-medium">${option.price.toLocaleString()}</p>
                    </div>
                    {user.role === 'admin' && option.cost && (
                      <div>
                        <p className="text-gray-400">Cost</p>
                        <p className="text-white font-medium">${option.cost.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductManagement;
