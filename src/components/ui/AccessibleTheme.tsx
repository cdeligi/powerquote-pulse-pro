
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { createContext, useContext, ReactNode } from 'react';

interface AccessibilityTheme {
  colors: {
    primary: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
    secondary: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
    success: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
    warning: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
    error: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
    neutral: {
      bg: string;
      text: string;
      border: string;
      hover: string;
    };
  };
}

// WCAG 2.1 AA compliant color scheme
const accessibilityTheme: AccessibilityTheme = {
  colors: {
    primary: {
      bg: 'bg-blue-600',
      text: 'text-white',
      border: 'border-blue-600',
      hover: 'hover:bg-blue-700'
    },
    secondary: {
      bg: 'bg-gray-600',
      text: 'text-white',
      border: 'border-gray-600',
      hover: 'hover:bg-gray-700'
    },
    success: {
      bg: 'bg-green-600',
      text: 'text-white',
      border: 'border-green-600',
      hover: 'hover:bg-green-700'
    },
    warning: {
      bg: 'bg-yellow-600',
      text: 'text-white',
      border: 'border-yellow-600',
      hover: 'hover:bg-yellow-700'
    },
    error: {
      bg: 'bg-red-600',
      text: 'text-white',
      border: 'border-red-600',
      hover: 'hover:bg-red-700'
    },
    neutral: {
      bg: 'bg-gray-800',
      text: 'text-white',
      border: 'border-gray-700',
      hover: 'hover:bg-gray-700'
    }
  }
};

const AccessibilityContext = createContext<AccessibilityTheme>(accessibilityTheme);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AccessibilityContext.Provider value={accessibilityTheme}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityTheme = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityTheme must be used within AccessibilityProvider');
  }
  return context;
};

// Utility function to get accessible button classes
export const getAccessibleButtonClasses = (variant: keyof AccessibilityTheme['colors']) => {
  const theme = accessibilityTheme.colors[variant];
  return `${theme.bg} ${theme.text} ${theme.border} ${theme.hover} transition-colors duration-200`;
};

// Utility function to get accessible text classes for dark backgrounds
export const getAccessibleTextClasses = (background: 'dark' | 'light' = 'dark') => {
  return background === 'dark' ? 'text-white' : 'text-gray-900';
};

// Utility function to get high contrast border classes
export const getAccessibleBorderClasses = (variant: keyof AccessibilityTheme['colors']) => {
  const theme = accessibilityTheme.colors[variant];
  return theme.border;
};
