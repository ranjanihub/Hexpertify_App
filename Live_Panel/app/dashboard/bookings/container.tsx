"use client";

import { useState, useEffect, useCallback } from "react";
import { BookingTable } from "@/app/dashboard/@components/booking-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download } from "lucide-react";
import { updateBookingStatus } from "./actions";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// -------------------------------------------
// REUSABLE CONFIRMATION DIALOG (same file)
// -------------------------------------------
import { Loader2 } from "lucide-react";

function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  isLoading,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="!text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface Booking {
  id: string;
  status: BookingStatus;
  user: { name: string; email: string };
  consultant: { name: string };
  service: { name: string; platform: string; price: number; duration: number };
  createdAt: string;
}

export default function BookingContainer({
  currentPage,
  pageSize,
  bookings,
  totalCount,
  initialSearch = "",
}: {
  currentPage?: number;
  pageSize?: number;
  bookings?: Booking[];
  totalCount?: number;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    status: BookingStatus;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isUpdating, setIsUpdating] = useState(false);

  // Debounced search - update URL after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (currentPage && currentPage > 1)
        params.set("page", currentPage.toString());
      if (pageSize) params.set("pageSize", pageSize.toString());

      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openConfirmDialog = (id: string, status: BookingStatus) => {
    setPendingAction({ id, status });
    setDialogOpen(true);
  };

  const confirmUpdate = async () => {
    if (!pendingAction) return;

    try {
      setIsUpdating(true);
      const { id, status } = pendingAction;
      const { success, message } = await updateBookingStatus(id, status);

      if (success) {
        toast.success("Booking status updated");
        setDialogOpen(false);
        setPendingAction(null);
      } else {
        toast.error(message || "Failed to update booking status");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    const headers = [
      "Client Name",
      "Client Email",
      "Consultant",
      "Service",
      "Platform",
      "Duration (min)",
      "Price ($)",
      "Status",
      "Created At",
    ];
    const rows = bookings.map((booking) => [
      booking.user.name,
      booking.user.email,
      booking.consultant.name,
      booking.service.name,
      booking.service.platform,
      booking.service.duration.toString(),
      booking.service.price.toString(),
      booking.status,
      booking.createdAt,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bookings_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully");
  };

  // Export to Excel (using HTML table method)
  const exportToExcel = () => {
    if (!bookings || bookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    const headers = [
      "Client Name",
      "Client Email",
      "Consultant",
      "Service",
      "Platform",
      "Duration (min)",
      "Price ($)",
      "Status",
      "Created At",
    ];
    const rows = bookings.map((booking) => [
      booking.user.name,
      booking.user.email,
      booking.consultant.name,
      booking.service.name,
      booking.service.platform,
      booking.service.duration,
      booking.service.price,
      booking.status,
      booking.createdAt,
    ]);

    let tableHTML = "<table><thead><tr>";
    headers.forEach((header) => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += "</tr></thead><tbody>";

    rows.forEach((row) => {
      tableHTML += "<tr>";
      row.forEach((cell) => {
        tableHTML += `<td>${cell}</td>`;
      });
      tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bookings_${new Date().toISOString().split("T")[0]}.xls`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel file downloaded successfully");
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className=" space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Bookings</h1>
              <p className="text-muted-foreground mt-1">
                Manage and update booking statuses
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by client, consultant, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                View and manage all booking entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingTable
                bookings={bookings || []}
                onStatusUpdate={(id, status) => openConfirmDialog(id, status)}
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onConfirm={confirmUpdate}
        title="Confirm Status Change"
        description={`Are you sure you want to update this booking’s status to "${pendingAction?.status}"?`}
        isLoading={isUpdating}
      />
    </main>
  );
}
