/**
 * Enhanced Canvas Toolbar with visual customization controls
 */

import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Hand, 
  Square, 
  Grid, 
  RotateCcw, 
  Download, 
  Upload,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ImageIcon
} from "lucide-react";

interface CanvasToolbarProps {
  selectedTool: 'select' | 'draw';
  onToolChange: (tool: 'select' | 'draw') => void;
  gridVisible: boolean;
  onGridToggle: () => void;
  onReset: () => void;
  onExport?: () => void;
  onImport?: () => void;
  slotsCount: number;
  maxSlots: number;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onBackgroundColorChange?: (color: string) => void;
  onBackgroundImageChange?: (file: File) => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  selectedTool,
  onToolChange,
  gridVisible,
  onGridToggle,
  onReset,
  onExport,
  onImport,
  slotsCount,
  maxSlots,
  canvasRef,
  onBackgroundColorChange,
  onBackgroundImageChange
}) => {
  const handleZoomIn = () => {
    if (canvasRef?.current) {
      // Add zoom functionality if needed
      console.log('Zoom in');
    }
  };

  const handleZoomOut = () => {
    if (canvasRef?.current) {
      // Add zoom functionality if needed
      console.log('Zoom out');
    }
  };

  const handleFitToScreen = () => {
    if (canvasRef?.current) {
      // Add fit to screen functionality if needed
      console.log('Fit to screen');
    }
  };

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onBackgroundImageChange) {
      onBackgroundImageChange(file);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        {/* Tool Selection */}
        <div className="flex gap-1">
          <Button
            onClick={() => onToolChange('select')}
            variant={selectedTool === 'select' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Hand className="h-4 w-4" />
            Select
          </Button>
          <Button
            onClick={() => onToolChange('draw')}
            variant={selectedTool === 'draw' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Draw
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Grid and View Controls */}
        <div className="flex gap-1">
          <Button
            onClick={onGridToggle}
            variant={gridVisible ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Grid
          </Button>
          
          <Button
            onClick={handleZoomIn}
            variant="outline"
            size="sm"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleZoomOut}
            variant="outline"
            size="sm"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleFitToScreen}
            variant="outline"
            size="sm"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Customization */}
        <div className="flex gap-1">
          {onBackgroundColorChange && (
            <div className="flex items-center gap-1">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <input
                type="color"
                defaultValue="#ffffff"
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-input cursor-pointer"
                title="Canvas Background Color"
              />
            </div>
          )}
          
          {onBackgroundImageChange && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => document.getElementById('bg-image-input')?.click()}
              >
                <ImageIcon className="h-4 w-4" />
                Background
              </Button>
              <input
                id="bg-image-input"
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          
          {onExport && (
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          
          {onImport && (
            <Button
              onClick={onImport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          )}
        </div>
      </div>

      {/* Status and Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Square className="h-3 w-3" />
            {slotsCount}/{maxSlots} slots
          </Badge>
          
          <Badge variant={selectedTool === 'select' ? 'default' : 'secondary'}>
            {selectedTool === 'select' ? 'Select Mode' : 'Draw Mode'}
          </Badge>
          
          {gridVisible && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Grid className="h-3 w-3" />
              Grid On
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};