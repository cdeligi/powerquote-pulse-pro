import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const QuoteSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const mockQuotes = [
    {
      id: 'Q-2024-001',
      customerName: 'ABC Power Company',
      total: 45250,
      status: 'pending_approval' as const,
      createdAt: '2024-01-15',
      currency: 'USD' as const
    },
    {
      id: 'Q-2024-002', 
      customerName: 'XYZ Electric',
      total: 32100,
      status: 'approved' as const,
      createdAt: '2024-01-14',
      currency: 'EURO' as const
    },
    {
      id: 'Q-2024-003',
      customerName: 'Global Energy Inc',
      total: 67890,
      status: 'rejected' as const,
      createdAt: '2024-01-10',
      currency: 'GBP' as const
    },
    {
      id: 'Q-2024-004',
      customerName: 'Power Solutions Ltd',
      total: 23450,
      status: 'draft' as const,
      createdAt: '2024-01-05',
      currency: 'CAD' as const
    },
    {
      id: 'Q-2024-005',
      customerName: 'Green Tech Corp',
      total: 78900,
      status: 'pending_approval' as const,
      createdAt: '2023-12-28',
      currency: 'USD' as const
    },
    {
      id: 'Q-2024-006',
      customerName: 'Northern Grid Co',
      total: 89400,
      status: 'approved' as const,
      createdAt: '2023-12-20',
      currency: 'EURO' as const
    },
    {
      id: 'Q-2024-007',
      customerName: 'Southern Electric Systems',
      total: 42100,
      status: 'rejected' as const,
      createdAt: '2023-12-15',
      currency: 'GBP' as const
    },
    {
      id: 'Q-2024-008',
      customerName: 'West Coast Power',
      total: 56780,
      status: 'draft' as const,
      createdAt: '2023-12-10',
      currency: 'CAD' as const
    },
    {
      id: 'Q-2024-009',
      customerName: 'East Energy Group',
      total: 90120,
      status: 'pending_approval' as const,
      createdAt: '2023-12-01',
      currency: 'USD' as const
    },
    {
      id: 'Q-2024-010',
      customerName: 'Central Power & Light',
      total: 12345,
      status: 'approved' as const,
      createdAt: '2023-11-25',
      currency: 'EURO' as const
    }
  ];

  const filteredQuotes = mockQuotes.filter(quote =>
    quote.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Quote Search</CardTitle>
        <CardDescription className="text-gray-400">
          Search existing quotes by customer name or quote ID
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <ScrollArea className="rounded-md border bg-secondary text-secondary-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Quote ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.id}</TableCell>
                  <TableCell>{quote.customerName}</TableCell>
                  <TableCell>{quote.createdAt}</TableCell>
                  <TableCell>{quote.total} {quote.currency}</TableCell>
                  <TableCell className="text-right">{quote.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default QuoteSearch;
