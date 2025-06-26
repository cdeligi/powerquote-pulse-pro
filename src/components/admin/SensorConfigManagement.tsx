import { useState } from "react";
import { productDataService } from "@/services/productDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SensorConfigManagement = () => {
  const [analogTypes, setAnalogTypes] = useState(productDataService.getAnalogSensorTypes());
  const [bushingModels, setBushingModels] = useState(productDataService.getBushingTapModels());

  const [analogForm, setAnalogForm] = useState({ name: "", description: "" });
  const [editingAnalogId, setEditingAnalogId] = useState<string | null>(null);

  const [bushingForm, setBushingForm] = useState({ name: "" });
  const [editingBushingId, setEditingBushingId] = useState<string | null>(null);

  const resetForms = () => {
    setAnalogForm({ name: "", description: "" });
    setEditingAnalogId(null);
    setBushingForm({ name: "" });
    setEditingBushingId(null);
  };

  const refresh = () => {
    setAnalogTypes(productDataService.getAnalogSensorTypes());
    setBushingModels(productDataService.getBushingTapModels());
  };

  const handleSaveAnalog = async () => {
    if (editingAnalogId) {
      await productDataService.updateAnalogSensorType(editingAnalogId, analogForm);
    } else {
      await productDataService.createAnalogSensorType(analogForm);
    }
    resetForms();
    refresh();
  };

  const handleEditAnalog = (id: string) => {
    const item = analogTypes.find(a => a.id === id);
    if (item) {
      setAnalogForm({ name: item.name, description: item.description });
      setEditingAnalogId(id);
    }
  };

  const handleSaveBushing = async () => {
    if (editingBushingId) {
      await productDataService.updateBushingTapModel(editingBushingId, bushingForm);
    } else {
      await productDataService.createBushingTapModel(bushingForm);
    }
    resetForms();
    refresh();
  };

  const handleEditBushing = (id: string) => {
    const item = bushingModels.find(b => b.id === id);
    if (item) {
      setBushingForm({ name: item.name });
      setEditingBushingId(id);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Analog Sensor Types</CardTitle>
          <CardDescription className="text-gray-400">Manage available analog sensors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analogTypes.map(type => (
            <div key={type.id} className="flex items-center space-x-2">
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{type.name}</p>
                <p className="text-gray-400 text-xs">{type.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleEditAnalog(type.id)} className="text-blue-400">
                Edit
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="analog-name" className="text-white text-sm">Name</Label>
              <Input id="analog-name" value={analogForm.name} onChange={e => setAnalogForm({ ...analogForm, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <Label htmlFor="analog-desc" className="text-white text-sm">Description</Label>
              <Input id="analog-desc" value={analogForm.description} onChange={e => setAnalogForm({ ...analogForm, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveAnalog} disabled={!analogForm.name}>
            {editingAnalogId ? "Update" : "Add"} Sensor Type
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Bushing Tap Models</CardTitle>
          <CardDescription className="text-gray-400">Manage available tap models</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bushingModels.map(model => (
            <div key={model.id} className="flex items-center space-x-2">
              <span className="flex-1 text-white text-sm">{model.name}</span>
              <Button variant="ghost" size="sm" onClick={() => handleEditBushing(model.id)} className="text-blue-400">
                Edit
              </Button>
            </div>
          ))}
          <div>
            <Label htmlFor="bushing-name" className="text-white text-sm">Name</Label>
            <Input id="bushing-name" value={bushingForm.name} onChange={e => setBushingForm({ name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
          </div>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveBushing} disabled={!bushingForm.name}>
            {editingBushingId ? "Update" : "Add"} Tap Model
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SensorConfigManagement;
