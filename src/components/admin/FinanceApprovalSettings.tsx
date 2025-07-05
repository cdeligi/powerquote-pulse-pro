
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { Settings, Save, DollarSign } from 'lucide-react';

const FinanceApprovalSettings = () => {
  const { marginSettings, loading, updateMarginLimit } = useFinanceApproval();
  const [newLimit, setNewLimit] = useState(marginSettings.marginLimit.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit < 0 || limit > 100) {
      return;
    }

    await updateMarginLimit(limit);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNewLimit(marginSettings.marginLimit.toString());
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-white">Loading finance settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Finance Approval Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 font-medium">Margin Threshold</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            Quotes with margins below this threshold require Finance approval
          </p>
          
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="margin-limit" className="text-white">
                  Minimum Margin Percentage
                </Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="margin-limit"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                    placeholder="Enter margin percentage"
                  />
                  <span className="text-white self-center">%</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                  {marginSettings.marginLimit}%
                </Badge>
                <span className="text-gray-400">minimum margin</span>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                size="sm"
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-400 space-y-1">
          <p>• Finance role users can approve any margin</p>
          <p>• Admin role users can approve margins ≥ threshold</p>
          <p>• Other users cannot approve low-margin quotes</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceApprovalSettings;
