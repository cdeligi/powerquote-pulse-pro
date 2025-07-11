import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BOMDisplay } from '@/components/bom/BOMDisplay';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    data: [
      // Mock BOM items
      {
        id: '1',
        name: 'Test Product',
        quantity: 1,
        unit_price: 100,
        unit_cost: 50,
        slot: 1,
        product_id: '123'
      },
      {
        id: '2',
        name: 'Another Product',
        quantity: 2,
        unit_price: 200,
        unit_cost: 100,
        slot: 2,
        product_id: '456'
      }
    ],
    error: null
  }
}));

describe('BOMDisplay', () => {
  const mockItems = [
    {
      id: '1',
      name: 'Test Product',
      quantity: 1,
      unit_price: 100,
      unit_cost: 50,
      slot: 1,
      product_id: '123'
    },
    {
      id: '2',
      name: 'Another Product',
      quantity: 2,
      unit_price: 200,
      unit_cost: 100,
      slot: 2,
      product_id: '456'
    }
  ];

  const mockSlotAssignments = {
    1: { product_id: '123', name: 'Test Product' },
    2: { product_id: '456', name: 'Another Product' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders BOM items with correct values', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <BOMDisplay
            items={mockItems}
            slotAssignments={mockSlotAssignments}
            onAddItem={() => {}}
            onRemoveItem={() => {}}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // quantity
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // price
    expect(screen.getByText('Another Product')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // quantity
    expect(screen.getByText('$200.00')).toBeInTheDocument(); // price
  });

  test('displays total cost and margin for admin users', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <BOMDisplay
            items={mockItems}
            slotAssignments={mockSlotAssignments}
            onAddItem={() => {}}
            onRemoveItem={() => {}}
            userRole="admin"
          />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Total Cost: $250.00')).toBeInTheDocument();
    expect(screen.getByText('Margin: 50.0%')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit: $250.00')).toBeInTheDocument();
  });

  test('handles quantity changes', async () => {
    const onAddItem = jest.fn();
    render(
      <MemoryRouter>
        <AuthProvider>
          <BOMDisplay
            items={mockItems}
            slotAssignments={mockSlotAssignments}
            onAddItem={onAddItem}
            onRemoveItem={() => {}}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    const quantityInput = screen.getByDisplayValue('1');
    fireEvent.change(quantityInput, { target: { value: '2' } });
    await waitFor(() => {
      expect(onAddItem).toHaveBeenCalledWith({
        ...mockItems[0],
        quantity: 2
      });
    });
  });

  test('handles item removal', async () => {
    const onRemoveItem = jest.fn();
    render(
      <MemoryRouter>
        <AuthProvider>
          <BOMDisplay
            items={mockItems}
            slotAssignments={mockSlotAssignments}
            onAddItem={() => {}}
            onRemoveItem={onRemoveItem}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    await waitFor(() => {
      expect(onRemoveItem).toHaveBeenCalledWith('1');
    });
  });

  test('displays slot assignments correctly', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <BOMDisplay
            items={mockItems}
            slotAssignments={mockSlotAssignments}
            onAddItem={() => {}}
            onRemoveItem={() => {}}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText('Slot 2')).toBeInTheDocument();
  });
});
