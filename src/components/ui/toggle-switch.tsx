
import React from 'react';
import { Switch } from '@/components/ui/switch';

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ToggleSwitch = ({ 
  checked, 
  onCheckedChange, 
  disabled = false,
  size = 'md' 
}: ToggleSwitchProps) => {
  const sizeClasses = {
    sm: 'h-4 w-8',
    md: 'h-6 w-11',
    lg: 'h-8 w-14'
  };

  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${checked 
          ? 'bg-green-600 data-[state=checked]:bg-green-600' 
          : 'bg-gray-600 data-[state=unchecked]:bg-gray-600'
        }
        transition-colors duration-200
      `}
    />
  );
};

export default ToggleSwitch;
