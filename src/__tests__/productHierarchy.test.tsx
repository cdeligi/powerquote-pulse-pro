import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { BOMBuilder } from '@/components/bom/BOMBuilder';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/hooks/useAuth';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    data: [
      // Mock Level 1 products
      { id: '1', name: 'QTMS Level 1', enabled: true },
      { id: '2', name: 'Another Level 1', enabled: true },
      
      // Mock Level 2 products
      { 
        id: '3', 
        name: 'Chassis 1', 
        parent_product_id: '1', 
        enabled: true,
        slot_count: 4,
        slot_mapping: JSON.stringify({
          0: { product_type: 'Card', product_id: '5' },
          1: { product_type: 'Card', product_id: '6' }
        })
      },
      { id: '4', name: 'Chassis 2', parent_product_id: '1', enabled: true },
      
      // Mock Level 3 products
      { id: '5', name: 'Card 1', parent_product_id: '3', enabled: true },
      { id: '6', name: 'Card 2', parent_product_id: '3', enabled: true },
      
      // Mock Level 4 products
      { id: '7', name: 'Configurable Card', parent_product_id: '5', enabled: true }
    ],
    error: null
  }
}));

describe('Product Hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and display Level 1 products', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('QTMS Level 1')).toBeInTheDocument();
      expect(screen.getByText('Another Level 1')).toBeInTheDocument();
    });
  });

  test('should display Level 2 products when Level 1 is selected', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    const level1Button = await screen.findByText('QTMS Level 1');
    fireEvent.click(level1Button);

    await waitFor(() => {
      expect(screen.getByText('Chassis 1')).toBeInTheDocument();
      expect(screen.getByText('Chassis 2')).toBeInTheDocument();
    });
  });

  test('should display chassis editor with slot mapping', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    const level1Button = await screen.findByText('QTMS Level 1');
    fireEvent.click(level1Button);

    const chassisButton = await screen.findByText('Chassis 1');
    fireEvent.click(chassisButton);

    await waitFor(() => {
      // Verify chassis canvas is rendered
      const canvas = screen.getByRole('img', { name: /chassis/i });
      expect(canvas).toBeInTheDocument();

      // Verify slot mapping is displayed
      expect(screen.getByText('Slot 1')).toBeInTheDocument();
      expect(screen.getByText('Slot 2')).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
    });
  });

  test('should allow slot assignment of Level 3 products', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    const level1Button = await screen.findByText('QTMS Level 1');
    fireEvent.click(level1Button);

    const chassisButton = await screen.findByText('Chassis 1');
    fireEvent.click(chassisButton);

    // Click on an empty slot
    const emptySlot = await screen.findByText('Slot 3');
    fireEvent.click(emptySlot);

    // Verify Level 3 products are displayed for selection
    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });

    // Select a card
    const cardButton = screen.getByText('Card 1');
    fireEvent.click(cardButton);

    // Verify slot assignment
    await waitFor(() => {
      expect(screen.getByText('Slot 3')).toBeInTheDocument();
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });
  });

  test('should handle Level 4 product configuration', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    const level1Button = await screen.findByText('QTMS Level 1');
    fireEvent.click(level1Button);

    const chassisButton = await screen.findByText('Chassis 1');
    fireEvent.click(chassisButton);

    const cardButton = await screen.findByText('Card 1');
    fireEvent.click(cardButton);

    // Verify Level 4 configuration options are displayed
    await waitFor(() => {
      expect(screen.getByText('Configurable Card')).toBeInTheDocument();
    });

    // Verify configuration options are editable
    const configOption = screen.getByRole('textbox', { name: /configuration/i });
    fireEvent.change(configOption, { target: { value: 'New Value' } });

    // Verify changes are saved
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('New Value')).toBeInTheDocument();
    });
  });

  test('should handle product hierarchy updates', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProductManagement />
        </AuthProvider>
      </MemoryRouter>
    );

    // Edit Level 1 product
    const level1Button = await screen.findByText('QTMS Level 1');
    fireEvent.click(level1Button);

    // Edit Level 2 product
    const chassisButton = await screen.findByText('Chassis 1');
    fireEvent.click(chassisButton);

    // Edit Level 3 product
    const cardButton = await screen.findByText('Card 1');
    fireEvent.click(cardButton);

    // Verify all levels are displayed
    await waitFor(() => {
      expect(screen.getByText('QTMS Level 1')).toBeInTheDocument();
      expect(screen.getByText('Chassis 1')).toBeInTheDocument();
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });
  });
});
