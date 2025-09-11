import { useState } from "react";
import { User } from "@/types/auth";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

interface QuoteSearchProps {
  user: User;
}

interface Quote {
  id: string;
  customerName: string;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  currency: 'USD' | 'EURO' | 'GBP' | 'CAD';
  createdAt: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const QuoteSearch = ({ user }: QuoteSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const mockQuotes = [
    {
      id: 'Q-2024-001',
      customerName: 'ABC Power Company',
      total: 45250,
      status: 'pending_approval' as const,
      currency: 'USD' as const,
      createdAt: '2024-01-15',
      priority: 'high' as const
    },
    {
      id: 'Q-2024-002',
      customerName: 'European Grid Solutions',
      total: 67800,
      status: 'approved' as const,
      currency: 'EURO' as const,
      createdAt: '2024-01-14',
      priority: 'normal' as const
    },
    {
      id: 'Q-2024-003',
      customerName: 'Global Energy Corp',
      total: 123000,
      status: 'draft' as const,
      currency: 'USD' as const,
      createdAt: '2024-01-10',
      priority: 'urgent' as const
    },
    {
      id: 'Q-2024-004',
      customerName: 'Power Grid International',
      total: 92600,
      status: 'approved' as const,
      currency: 'GBP' as const,
      createdAt: '2024-01-05',
      priority: 'normal' as const
    },
    {
      id: 'Q-2024-005',
      customerName: 'Canadian Power Systems',
      total: 54100,
      status: 'rejected' as const,
      currency: 'CAD' as const,
      createdAt: '2023-12-28',
      priority: 'low' as const
    },
    {
      id: 'Q-2024-006',
      customerName: 'Northern Grid Co',
      total: 89400,
      status: 'pending_approval' as const,
      currency: 'USD' as const,
      createdAt: '2023-12-20',
      priority: 'high' as const
    }
  ];

  const filteredQuotes = mockQuotes.filter(quote =>
    quote.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-500';
      case 'pending_approval': return 'text-yellow-500';
      case 'approved': return 'text-green-500';
      case 'rejected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: Quote['priority']) => {
    switch (priority) {
      case 'low': return 'text-gray-500';
      case 'normal': return 'text-blue-500';
      case 'high': return 'text-yellow-500';
      case 'urgent': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const currencySymbols: Record<string, string> = {
    USD: '$',
    EURO: '€',
    GBP: '£',
    CAD: 'CA$'
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search quotes by customer or quote ID..."
        className="bg-background border-border text-foreground"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Table>
        <TableHeader>
          <TableRow className="border-b-gray-200 dark:border-b-gray-800">
            <TableHead>Quote ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuotes.map(quote => (
            <TableRow key={quote.id} className="border-b-gray-200 dark:border-b-gray-800">
              <TableCell className="text-muted-foreground">{quote.id}</TableCell>
              <TableCell className="text-foreground">{quote.customerName}</TableCell>
              <TableCell className="text-foreground">
                {currencySymbols[quote.currency] || '$'}
                {quote.total.toLocaleString()}
              </TableCell>
              <TableCell>
                <span className={getStatusColor(quote.status)}>{quote.status}</span>
              </TableCell>
              <TableCell>
                <span className={getPriorityColor(quote.priority)}>{quote.priority}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{quote.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default QuoteSearch;
