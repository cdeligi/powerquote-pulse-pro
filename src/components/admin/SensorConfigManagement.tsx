import { useState, useEffect } from "react";
import { productDataService } from "@/services/productDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SensorConfigManagementProps {
  showAnalog?: boolean;
  showBushing?: boolean;
}

const SensorConfigManagement = ({ showAnalog = true, showBushing = true }: SensorConfigManagementProps) => {
  const [analogTypes, setAnalogTypes] = useState<any[]>([]);
  const [bushingModels, setBushingModels] = useState<any[]>([]);

  const [analogForm, setAnalogForm] = useState({ name: "", description: "" });
  const [editingAnalogId, setEditingAnalogId] = useState<string | null>(null);

  const [bushingForm, setBushingForm] = useState({ name: "" });
  const [editingBushingId, setEditingBushingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const analogData = await productDataService.getAnalogSensorTypes();
      const bushingData = await productDataService.getBushingTapModels();
      setAnalogTypes(analogData);
      setBushingModels(bushingData);
    };
    loadData();
  }, []);

  const resetForms = () => {
    setAnalogForm({ name: "", description: "" });
    setEditingAnalogId(null);
    setBushingForm({ name: "" });
    setEditingBushingId(null);
  };

  const refresh = async () => {
    const analogData = await productDataService.getAnalogSensorTypes();
    const bushingData = await productDataService.getBushingTapModels();
    setAnalogTypes(analogData);
    setBushingModels(bushingData);
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

  const handleDeleteAnalog = async (id: string) => {
    await productDataService.deleteAnalogSensorType(id);
    if (editingAnalogId === id) {
      setAnalogForm({ name: "", description: "" });
      setEditingAnalogId(null);
    }
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

  const handleDeleteBushing = async (id: string) => {
    await productDataService.deleteBushingTapModel(id);
    if (editingBushingId === id) {
      setBushingForm({ name: "" });
      setEditingBushingId(null);
    }
    refresh();
  };

  const handleEditBushing = (id: string) => {
    const item = bushingModels.find(b => b.id === id);
    if (item) {
      setBushingForm({ name: item.name });
      setEditingBushingId(id);
    }
  };

  const handleCancelBushing = () => {
    setBushingForm({ name: "" });
    setEditingBushingId(null);
  };

  return (
    <div className="space-y-6">
      {showAnalog && (
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
                <Button variant="ghost" size="sm" onClick={() => handleDeleteAnalog(type.id)} className="text-red-400">
                  Delete
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
      )}

      {showBushing && (
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
                <Button variant="ghost" size="sm" onClick={() => handleDeleteBushing(model.id)} className="text-red-400">
                  Delete
                </Button>
              </div>
            ))}
            <div>
              <Label htmlFor="bushing-name" className="text-white text-sm">Name</Label>
              <Input
                id="bushing-name"
                value={bushingForm.name}
                onChange={e => setBushingForm({ name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleSaveBushing}
                disabled={!bushingForm.name}
              >
                {editingBushingId ? "Update" : "Add"} Tap Model
              </Button>
              {editingBushingId && (
                <Button variant="outline" onClick={handleCancelBushing}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SensorConfigManagement;
