"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Check, ChevronDown } from "lucide-react";
import { PaginationWithLinks } from "@/components/ui/pagination-with-links";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface Booking {
  id: string;
  status: BookingStatus;
  meetingUrl?: string;
  user: { name: string; email: string; phoneNumber?: string | null };
  consultant: { name: string };
  service: { name: string; platform: string; price: number; duration: number };

  createdAt: string;
}

interface BookingTableProps {
  bookings: Booking[];
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
}

const statusColors: Record<BookingStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusOptions: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

export function BookingTable({
  bookings,
  onStatusUpdate,
  currentPage,
  pageSize,
  totalCount,
}: BookingTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = (url: string, bookingId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(bookingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Consultant</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead className="text-center">Duration</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{booking.user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {booking.user.email}
                  </div>
                  {booking.user.phoneNumber && (
                    <div className="text-sm text-muted-foreground">
                      {booking.user.phoneNumber}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{booking.consultant.name}</TableCell>
              <TableCell>{booking.service.name}</TableCell>
              <TableCell className="whitespace-nowrap">
                {booking.service.platform}
              </TableCell>
              <TableCell className="text-center">
                {booking.service.duration}m
              </TableCell>
              <TableCell className="text-right font-medium">
                ${booking.service.price}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[booking.status]}`}
                >
                  {booking.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {statusOptions.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => onStatusUpdate(booking.id, status)}
                          className={
                            booking.status === status ? "bg-muted" : ""
                          }
                        >
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {bookings.length > 0 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <PaginationWithLinks
            page={currentPage || 1}
            pageSize={pageSize || 10}
            totalCount={totalCount || 0}
            pageSizeSelectOptions={{
              pageSizeOptions: [5, 10, 25, 50],
            }}
          />
        </div>
      )}
    </div>
  );
}
