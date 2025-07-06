
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, DollarSign, Edit3, Save, X, Settings, Cog } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BOMBuilder from "@/components/bom/BOMBuilder";
import { useState, useEffect } from "react";
import { Quote, BOMItemWithDetails } from "@/types/quote";
import { User } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";

interface QuoteDetailsProps {
  quote: Quote;
  onApprove: (notes?: string, updatedBOMItems?: any[]) => void;
  onReject: (notes?: string) => void;
  isLoading: boolean;
  user: User | null;
}

const QuoteDetails = ({ 
  quote, 
  onApprove, 
  onReject, 
  isLoading,
  user 
}: QuoteDetailsProps) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>(
    (quote.bom_items || []).map(item => ({
      ...item,
      id: item.id || Math.random().toString(),
      name: item.name || item.product?.name || 'Unknown Item',
      description: item.description || item.product?.description || '',
      part_number: item.part_number || item.partNumber || '',
      unit_price: item.unit_price || item.product?.price || 0,
      unit_cost: item.unit_cost || item.product?.cost || 0,
      total_price: item.total_price || (item.product?.price || 0) * item.quantity,
      margin: item.margin || 0,
      quantity: item.quantity || 1,
      product: item.product
    }))
  );

  const handleApprove = () => {
    onApprove(approvalNotes, bomItems);
    setApprovalNotes('');
    setSelectedAction(null);
  };

  const handleReject = () => {
    onReject(rejectionReason);
    setRejectionReason('');
    setSelectedAction(null);
  };

  const handlePriceEdit = (itemId: string, newPrice: string) => {
    setEditingPrices(prev => ({ ...prev, [itemId]: newPrice }));
  };

  const handlePriceUpdate = (itemId: string) => {
    const newPrice = parseFloat(editingPrices[itemId] || '0');
    setBomItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          unit_price: newPrice,
          total_price: newPrice * item.quantity,
          margin: newPrice > 0 ? ((newPrice - item.unit_cost) / newPrice) * 100 : 0
        };
        return updatedItem;
      }
      return item;
    }));
    
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handlePriceEditCancel = (itemId: string) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const calculateTotals = () => {
    const totalRevenue = bomItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalCost = bomItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    const grossProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, grossProfit, marginPercentage };
  };

  const totals = calculateTotals();
  const isAdmin = user && ['admin', 'finance'].includes(user.role);

  const getStatusBadge = () => {
    switch (quote.status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-600 text-white">Pending Approval</Badge>;
      case 'draft':
        return <Badge className="bg-gray-600 text-white">Draft</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quote Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Quote Information - {quote.id}
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
              <Badge className={`${
                quote.priority === 'Urgent' ? 'bg-red-500' :
                quote.priority === 'High' ? 'bg-orange-500' :
                quote.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
              } text-white`}>
                {quote.priority}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-300">Customer</Label>
              <p className="text-white font-medium">{quote.customer_name}</p>
            </div>
            <div>
              <Label className="text-gray-300">Oracle Customer ID</Label>
              <p className="text-white font-medium">{quote.oracle_customer_id}</p>
            </div>
            <div>
              <Label className="text-gray-300">SFDC Opportunity</Label>
              <p className="text-white font-medium">{quote.sfdc_opportunity}</p>
            </div>
            <div>
              <Label className="text-gray-300">Rep Involved</Label>
              <p className="text-white font-medium">{quote.is_rep_involved ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-500" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">${totals.totalRevenue.toLocaleString()}</div>
              <div className="text-gray-300 text-sm">Total Revenue</div>
            </div>
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">${totals.totalCost.toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Total Cost</div>
              </div>
            )}
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">${totals.grossProfit.toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Gross Profit</div>
              </div>
            )}
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className={`text-2xl font-bold ${totals.marginPercentage >= 25 ? 'text-green-400' : totals.marginPercentage >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {totals.marginPercentage.toFixed(1)}%
                </div>
                <div className="text-gray-300 text-sm">Overall Margin</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BOM Items with Edit Configuration */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Review Details & BOM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bomItems.map((item, index) => (
              <div key={item.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-gray-300 text-sm">{item.description}</p>
                    {item.part_number && (
                      <p className="text-gray-400 text-xs">Part: {item.part_number}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-blue-400 border-blue-600">
                      Qty: {item.quantity}
                    </Badge>
                    {isAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          >
                            <Cog className="h-4 w-4 mr-1" />
                            Edit Configuration
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
                          <DialogHeader>
                            <DialogTitle className="text-white">Edit Configuration - {item.name}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <BOMBuilder
                              onBOMUpdate={() => {}}
                              canSeePrices={true}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="text-gray-300 text-xs">Unit Price</div>
                    <div className="text-white font-semibold text-sm">${item.unit_price.toFixed(2)}</div>
                  </div>
                  {isAdmin && (
                    <div className="bg-gray-700 p-2 rounded">
                      <div className="text-gray-300 text-xs">Unit Cost</div>
                      <div className="text-white font-semibold text-sm">${item.unit_cost.toFixed(2)}</div>
                    </div>
                  )}
                  <div className="bg-gray-700 p-2 rounded">
                    <div className="text-gray-300 text-xs">Total Price</div>
                    <div className="text-green-400 font-semibold text-sm">${item.total_price.toFixed(2)}</div>
                  </div>
                  {isAdmin && (
                    <div className="bg-gray-700 p-2 rounded">
                      <div className="text-gray-300 text-xs">Margin</div>
                      <div className={`font-semibold text-sm ${item.margin >= 25 ? 'text-green-400' : item.margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {item.margin.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {isAdmin && editingPrices[item.id] !== undefined && (
                    <div className="bg-gray-700 p-2 rounded">
                      <div className="text-gray-300 text-xs">Edit Price</div>
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editingPrices[item.id]}
                          onChange={(e) => handlePriceEdit(item.id, e.target.value)}
                          className="bg-gray-600 border-gray-500 text-white text-xs h-6"
                        />
                        <Button size="sm" onClick={() => handlePriceUpdate(item.id)} className="h-6 px-2 text-xs">
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handlePriceEditCancel(item.id)} className="h-6 px-2 text-xs">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {isAdmin && editingPrices[item.id] === undefined && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePriceEdit(item.id, item.unit_price.toString())}
                      className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit Price
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {selectedAction === 'approve' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Approval Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              placeholder="Add any approval notes..."
              rows={3}
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Approval
              </Button>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAction === 'reject' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              placeholder="Please provide a reason for rejecting this quote..."
              rows={4}
              required
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Confirm Rejection
              </Button>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedAction && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setSelectedAction('approve')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Quote
              </Button>
              <Button 
                onClick={() => setSelectedAction('reject')}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteDetails;
