// "use client"

// import { useState, useEffect } from "react"
// import Link from "next/link"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Edit, Trash2, Plus } from "lucide-react"
// import { toast } from "sonner"
// import { PaginationWithLinks } from "@/components/ui/pagination-with-links"
// import { deleteProfession } from "./actions"

// interface Profession {
//     id: string
//     name: string
//     identifier: string
//     imageUrl?: string
//     createdAt: string
// }

// export default function ProfessionsContainer({ professions, currentPage, pageSize, totalCount }: {
//     professions: Profession[]
//     currentPage: number
//     pageSize: number
//     totalCount: number
// }) {

//     const handleDelete = async (id: string) => {

//         try {
//             const { success } = await deleteProfession(id);
//             if (!success) throw new Error("Failed to delete profession")
//             toast.success("Profession deleted successfully")
//         } catch (error) {
//             toast.error("Failed to delete profession")
//         }
//     }

//     return (
//         <main className="bg-background p-8">
//             <div className="max-w-6xl mx-auto">
//                 <div className="flex items-center justify-between mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold">Professions</h1>
//                         <p className="text-muted-foreground mt-1">Manage your profession listings</p>
//                     </div>
//                     <Link href="professions/create">
//                         <Button className="!text-white">
//                             <Plus className="h-4 w-4 mr-2" />
//                             New Profession
//                         </Button>
//                     </Link>
//                 </div>

//                 <Card>
//                     <CardHeader>
//                         <CardTitle>All Professions</CardTitle>
//                         <CardDescription>View and manage all profession entries</CardDescription>
//                     </CardHeader>
//                     <CardContent>
//                         {professions.length === 0 ? (
//                             <div className="text-center py-8">
//                                 <p className="text-muted-foreground mb-4">No professions yet</p>
//                                 <Link href="professions/create">
//                                     <Button variant="outline">Create your first profession</Button>
//                                 </Link>
//                             </div>
//                         ) : (
//                             <>
//                                 <Table>
//                                     <TableHeader>
//                                         <TableRow>
//                                             <TableHead>Name</TableHead>
//                                             <TableHead>Identifier</TableHead>
//                                             <TableHead>Created</TableHead>
//                                             <TableHead className="text-right">Actions</TableHead>
//                                         </TableRow>
//                                     </TableHeader>
//                                     <TableBody>
//                                         {professions.map((profession) => (
//                                             <TableRow key={profession.id}>
//                                                 <TableCell className="font-medium">{profession.name}</TableCell>
//                                                 <TableCell>{profession.identifier}</TableCell>
//                                                 <TableCell>{new Date(profession.createdAt).toLocaleDateString()}</TableCell>
//                                                 <TableCell className="text-right">
//                                                     <div className="flex items-center justify-end gap-2">
//                                                         <Link href={`/dashboard/professions/${profession.id}/edit`}>
//                                                             <Button variant="ghost" size="sm">
//                                                                 <Edit className="h-4 w-4" />
//                                                             </Button>
//                                                         </Link>
//                                                         <Button
//                                                             variant="ghost"
//                                                             size="sm"
//                                                             onClick={() => handleDelete(profession.id)}
//                                                             className="text-destructive hover:text-destructive"
//                                                         >
//                                                             <Trash2 className="h-4 w-4" />
//                                                         </Button>
//                                                     </div>
//                                                 </TableCell>
//                                             </TableRow>
//                                         ))}
//                                     </TableBody>
//                                 </Table>
//                                 {professions.length > 0 && (
//                                     <div className="flex items-center justify-end space-x-2 py-4">
//                                         <PaginationWithLinks
//                                             page={currentPage}
//                                             pageSize={pageSize}
//                                             totalCount={totalCount}
//                                             pageSizeSelectOptions={{
//                                                 pageSizeOptions: [5, 10, 25, 50],
//                                             }}
//                                         />
//                                     </div>
//                                 )}

//                             </>
//                         )}
//                     </CardContent>
//                 </Card>
//             </div>
//         </main>
//     )
// }
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { deleteProfession } from "./actions";

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

interface Profession {
  id: string;
  name: string;
  identifier: string;
  imageUrl?: string;
  createdAt: string;
}

export default function ProfessionsContainer({
  professions,
  currentPage,
  pageSize,
  totalCount,
}: {
  professions: Profession[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
}) {
  const handleDelete = async (id: string) => {
    try {
      const { success } = await deleteProfession(id);
      if (!success) throw new Error("Failed to delete profession");
      toast.success("Profession deleted successfully");
    } catch (error) {
      toast.error("Failed to delete profession");
    }
  };

  return (
    <main className="bg-background p-8">
      <div className="">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Professions</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profession listings
            </p>
          </div>
          <Link href="professions/create">
            <Button className="!text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Profession
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Professions</CardTitle>
            <CardDescription>
              View and manage all profession entries
            </CardDescription>
          </CardHeader>

          <CardContent>
            {professions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No professions yet</p>
                <Link href="professions/create">
                  <Button variant="outline">
                    Create your first profession
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {professions.map((profession) => (
                      <TableRow key={profession.id}>
                        <TableCell className="font-medium">
                          {profession.name}
                        </TableCell>
                        <TableCell>{profession.identifier}</TableCell>
                        <TableCell>
                          {new Date(profession.createdAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit Button */}
                            <Link
                              href={`/dashboard/professions/${profession.id}/edit`}
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
                                    Delete Profession?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the profession from your
                                    database.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                                  <AlertDialogAction
                                    onClick={() => handleDelete(profession.id)}
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

                {professions.length > 0 && (
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
