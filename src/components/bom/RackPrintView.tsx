
import { Chassis, Card as ProductCard } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Cpu } from "lucide-react";

interface RackPrintViewProps {
  chassis: Chassis;
  slotAssignments: Record<number, ProductCard>;
  onPrint: () => void;
}

const RackPrintView = ({ chassis, slotAssignments, onPrint }: RackPrintViewProps) => {
  const generatePrintHTML = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getSlotLabel = (slot: number) => {
      if (slot === 0) return 'CPU';
      if (slotAssignments[slot]) {
        const card = slotAssignments[slot];
        return card.type.charAt(0).toUpperCase() + card.type.slice(1);
      }
      return `${slot}`;
    };

    const getSlotTitle = (slot: number) => {
      if (slot === 0) return 'CPU (Fixed)';
      if (slotAssignments[slot]) return slotAssignments[slot].name;
      return `Slot ${slot} - Empty`;
    };

    const renderSlotForPrint = (slot: number) => {
      const isOccupied = slotAssignments[slot];
      const isCPU = slot === 0;
      
      return `
        <div class="slot ${isCPU ? 'cpu-slot' : ''} ${isOccupied ? 'occupied-slot' : 'empty-slot'}">
          <div class="slot-number">${getSlotLabel(slot)}</div>
          <div class="slot-title">${getSlotTitle(slot)}</div>
          ${isOccupied && !isCPU ? `<div class="part-number">${isOccupied.partNumber || 'TBD'}</div>` : ''}
        </div>
      `;
    };

    const renderChassisLayoutForPrint = () => {
      if (chassis.type === 'LTX') {
        const topRowSlots = [8, 9, 10, 11, 12, 13, 14];
        const bottomRowSlots = [0, 1, 2, 3, 4, 5, 6, 7];
        
        return `
          <div class="chassis-layout">
            <div class="slot-row top-row">
              ${topRowSlots.map(renderSlotForPrint).join('')}
            </div>
            <div class="slot-row bottom-row">
              ${bottomRowSlots.map(renderSlotForPrint).join('')}
            </div>
          </div>
        `;
      } else if (chassis.type === 'MTX') {
        const slots = [0, 1, 2, 3, 4, 5, 6, 7];
        return `
          <div class="chassis-layout">
            <div class="slot-row">
              ${slots.map(renderSlotForPrint).join('')}
            </div>
          </div>
        `;
      } else {
        const slots = [0, 1, 2, 3, 4];
        return `
          <div class="chassis-layout">
            <div class="slot-row">
              ${slots.map(renderSlotForPrint).join('')}
            </div>
          </div>
        `;
      }
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rack Configuration - ${chassis.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333; 
            background: white;
          }
          .header { 
            border-bottom: 2px solid #dc2626; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
            text-align: center;
          }
          .logo { 
            color: #dc2626; 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .chassis-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
          }
          .chassis-layout {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin: 30px 0;
            justify-content: center;
            align-items: center;
          }
          .slot-row {
            display: flex;
            gap: 8px;
            justify-content: center;
          }
          .slot {
            width: 100px;
            height: 80px;
            border: 2px solid #333;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 5px;
            box-sizing: border-box;
          }
          .cpu-slot {
            background: #3b82f6;
            color: white;
            font-weight: bold;
          }
          .occupied-slot {
            background: #16a34a;
            color: white;
          }
          .empty-slot {
            background: #f3f4f6;
            border-style: dashed;
            color: #6b7280;
          }
          .slot-number {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .slot-title {
            font-size: 10px;
            line-height: 1.2;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          .part-number {
            font-size: 8px;
            margin-top: 2px;
            font-style: italic;
          }
          .legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 1px solid #333;
          }
          .assignments-list {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .assignment-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .assignment-item:last-child {
            border-bottom: none;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          @media print { 
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">QUALITROL</div>
          <h1>Rack Configuration</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="chassis-info">
          <h2>${chassis.name}</h2>
          <p><strong>Type:</strong> ${chassis.type} • <strong>Height:</strong> ${chassis.height} • <strong>Slots:</strong> ${chassis.slots}</p>
          <p><strong>Description:</strong> ${chassis.description}</p>
          ${chassis.partNumber ? `<p><strong>Part Number:</strong> ${chassis.partNumber}</p>` : ''}
        </div>

        <h2 style="text-align: center; margin-bottom: 20px;">Slot Layout</h2>
        ${renderChassisLayoutForPrint()}

        <div class="legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #3b82f6;"></div>
            <span>CPU (Fixed)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #16a34a;"></div>
            <span>Occupied</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f3f4f6; border-style: dashed;"></div>
            <span>Empty</span>
          </div>
        </div>

        ${Object.keys(slotAssignments).length > 0 ? `
          <div class="assignments-list">
            <h3>Card Assignments</h3>
            ${Object.entries(slotAssignments)
              .filter(([slot]) => parseInt(slot) !== 0)
              .map(([slot, card]) => `
                <div class="assignment-item">
                  <span><strong>Slot ${slot}:</strong> ${card.name}</span>
                  <span>${card.partNumber || 'TBD'}</span>
                </div>
              `).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <p>This rack configuration was generated by the Qualitrol Quote System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Print Configuration</span>
          <Button
            onClick={generatePrintHTML}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Layout
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm">
          Print a detailed layout of your rack configuration showing all slot assignments and card details.
        </p>
      </CardContent>
    </Card>
  );
};

export default RackPrintView;
