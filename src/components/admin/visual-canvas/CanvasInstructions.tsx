/**
 * Canvas Instructions and Help Component
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mouse, 
  Keyboard, 
  Hand, 
  Square, 
  RotateCcw,
  Grid,
  Edit
} from "lucide-react";

interface CanvasInstructionsProps {
  selectedTool: 'select' | 'draw';
  gridVisible: boolean;
}

export const CanvasInstructions: React.FC<CanvasInstructionsProps> = ({
  selectedTool,
  gridVisible
}) => {
  const instructions = [
    {
      icon: Mouse,
      title: selectedTool === 'select' ? 'Select Mode' : 'Draw Mode',
      items: selectedTool === 'select' 
        ? [
            'Click and drag slots to move them',
            'Drag corners/edges to resize slots',
            'Double-click a slot to edit properties',
            'Right-click a slot to delete it'
          ]
        : [
            'Click on empty canvas to create new slots',
            'Slots will automatically snap to grid',
            'Switch to Select mode to move/edit slots'
          ]
    },
    {
      icon: Keyboard,
      title: 'Keyboard Shortcuts',
      items: [
        'Arrow keys: Move selected slot (5px steps)',
        'Shift + Arrow keys: Move with grid snap',
        'Delete/Backspace: Remove selected slot',
        'Double-click: Edit slot properties'
      ]
    },
    {
      icon: Grid,
      title: 'Grid System',
      items: [
        `Grid is currently ${gridVisible ? 'enabled' : 'disabled'}`,
        'Objects snap to 20px grid when enabled',
        'Hold Shift for precise grid alignment',
        'Grid helps maintain clean layouts'
      ]
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {instructions.map((section, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium">{section.title}</h4>
              </div>
              <ul className="space-y-1 ml-6">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="pt-2 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <Hand className="h-3 w-3 mr-1" />
                Select Tool
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Square className="h-3 w-3 mr-1" />
                Draw Tool
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Double-click to Edit
              </Badge>
              <Badge variant="outline" className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Right-click to Delete
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};