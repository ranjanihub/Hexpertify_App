import React from "react";
import ProfessionsContainer from "./container";
import { ISearchParams } from "@/app/typrs";
import { listBookings } from "./actions";
import dayjs from "dayjs";
import BookingContainer from "./container";

export const metadata = {
  title: "Bookings",
  description: "Admin dashboard for managing bookings.",
};

export default async function ProfessionsPage({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) {
  const { page, pageSize, search } = (await searchParams) || {};

  const currentPage = parseInt(page || "1", 10);
  const postPageSize = parseInt(pageSize || "5", 10);
  const { data, total } = await listBookings(currentPage, postPageSize, {
    search,
  });
  const normalizedItems = (data || []).map((p) => ({
    ...p,
    createdAt: dayjs(p.createdAt).format("YYYY-MM-DD HH:mm:ss"),
  }));
  return (
    <div>
      <BookingContainer
        bookings={normalizedItems as any}
        currentPage={currentPage}
        pageSize={postPageSize}
        totalCount={total || 0}
        initialSearch={search || ""}
      />
    </div>
  );
}
