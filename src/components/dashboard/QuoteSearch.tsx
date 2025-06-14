import { useState } from "react";
import { User } from "@/types/auth";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Quote {
  id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  priority: string;
  oracleCustomerId: string;
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: 'USD' | 'EURO' | 'GBP';
  items: any[];
}

interface QuoteSearchProps {
  user: User;
}

const QuoteSearch = ({ user }: QuoteSearchProps) => {
  const [quotes] = useState<Quote[]>([
    {
      id: 'Q-001',
      customerName: 'ABC Power Company',
      total: 125000,
      status: 'pending_approval',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      priority: 'high',
      oracleCustomerId: 'ORD-12345',
      isRepInvolved: true,
      shippingTerms: 'FOB Origin',
      paymentTerms: '30 days net',
      quoteCurrency: 'USD' as const,
      items: []
    },
    {
      id: 'Q-002', 
      customerName: 'DEF Utilities',
      total: 87500,
      status: 'approved',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12',
      priority: 'medium',
      oracleCustomerId: 'ORD-67890',
      isRepInvolved: false,
      shippingTerms: 'FOB Destination',
      paymentTerms: '45 days net',
      quoteCurrency: 'EURO' as const,
      items: []
    },
    {
      id: 'Q-003',
      customerName: 'GHI Industries',
      total: 210000,
      status: 'needs_review',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-08',
      priority: 'high',
      oracleCustomerId: 'ORD-13579',
      isRepInvolved: true,
      shippingTerms: 'CIF',
      paymentTerms: '60 days net',
      quoteCurrency: 'GBP' as const,
      items: []
    },
    {
      id: 'Q-004',
      customerName: 'JKL Corporation',
      total: 55000,
      status: 'draft',
      createdAt: '2023-12-28',
      updatedAt: '2023-12-28',
      priority: 'low',
      oracleCustomerId: 'ORD-24680',
      isRepInvolved: false,
      shippingTerms: 'EXW',
      paymentTerms: 'Due on receipt',
      quoteCurrency: 'USD' as const,
      items: []
    },
    {
      id: 'Q-005',
      customerName: 'MNO Enterprises',
      total: 168000,
      status: 'approved',
      createdAt: '2023-12-20',
      updatedAt: '2023-12-22',
      priority: 'medium',
      oracleCustomerId: 'ORD-98765',
      isRepInvolved: true,
      shippingTerms: 'DDP',
      paymentTerms: '30 days net',
      quoteCurrency: 'EURO' as const,
      items: []
    }
  ]);

  return (
    <div>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-white">Quote List</h2>
      </div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Search quotes..."
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableCaption>A list of your recent quotes.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Quote ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">{quote.id}</TableCell>
                <TableCell>{quote.customerName}</TableCell>
                <TableCell>{quote.status}</TableCell>
                <TableCell>{quote.priority}</TableCell>
                <TableCell className="text-right">{quote.total}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default QuoteSearch;
