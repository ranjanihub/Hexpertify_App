"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PaginationWithLinks } from "@/components/ui/pagination-with-links";
import { deleteConsultant } from "./actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Consultant {
  id: string;
  name: string;
  email: string;
  identifier: string;
  experience: number;
  isCertified: boolean;
  photoUrl?: string;
  createdAt: string;
  reviewsCount?: number;
  averageRating?: number;
}

export default function ConsultantsContainer({
  consultants,
  currentPage,
  pageSize,
  totalCount,
}: {
  consultants: Consultant[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
}) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteConsultant(id);
      if (!result.success) throw new Error("Failed to delete consultant");
      toast.success("Consultant deleted successfully");
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete consultant");
    }
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Consultants</h1>
            <p className="text-muted-foreground mt-1">
              Manage your consultant profiles
            </p>
          </div>
          <Link href="/dashboard/consultants/create">
            <Button className="text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Consultant
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Consultants</CardTitle>
            <CardDescription>
              View and manage all consultant entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consultants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No consultants yet</p>
                <Link href="/dashboard/consultants/create">
                  <Button variant="outline">
                    Create your first consultant
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Certified</TableHead>
                      <TableHead>Reviews</TableHead>
                      <TableHead>Avg Rating</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultants.map((consultant) => (
                      <TableRow key={consultant.id}>
                        <TableCell className="font-medium">
                          {consultant.name}
                        </TableCell>
                        <TableCell>{consultant.email}</TableCell>
                        <TableCell>{consultant.experience} years</TableCell>
                        <TableCell>
                          {consultant.isCertified ? "✓" : "✗"}
                        </TableCell>
                        <TableCell>{consultant.reviewsCount || 0}</TableCell>
                        <TableCell>
                          {consultant.averageRating
                            ? `${consultant.averageRating.toFixed(1)} ⭐`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {new Date(consultant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit Button */}
                            <Link
                              href={`/dashboard/consultants/${consultant.id}/edit`}
                            >
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>

                            {/* Delete With Confirmation Popup */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Consultant?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the consultant and all
                                    related data from your database.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                                  <AlertDialogAction
                                    onClick={() => handleDelete(consultant.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {consultants.length > 0 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <PaginationWithLinks
                      page={currentPage}
                      pageSize={pageSize}
                      totalCount={totalCount}
                      pageSizeSelectOptions={{
                        pageSizeOptions: [5, 10, 25, 50],
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
