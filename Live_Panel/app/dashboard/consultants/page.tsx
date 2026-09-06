import React from "react";
import ConsultantsContainer from "./container";
import { ISearchParams } from "@/app/typrs";
import { listConsultants } from "./actions";
import dayjs from "dayjs";

interface IConsultantsPage {
  searchParams: Promise<ISearchParams>;
}
export async function generateMetadata() {
  return {
    title: "Consultants",
    description: "Admin dashboard for managing consultants.",
  };
}
export default async function ConsultantsPage({
  searchParams,
}: IConsultantsPage) {
  const { page, pageSize } = (await searchParams) || {};

  const currentPage = parseInt(page || "1", 10);
  const postPageSize = parseInt(pageSize || "10", 10);

  const result = await listConsultants(currentPage, postPageSize);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-destructive">Failed to load consultants</p>
        </div>
      </div>
    );
  }

  const { data: consultants, total } = result.data;

  const normalizedConsultants = (consultants || []).map((c: any) => ({
    ...c,
    photoUrl: c.photoUrl ?? undefined,
    createdAt: dayjs(c.createdAt).format("YYYY-MM-DD HH:mm:ss"),
  }));

  return (
    <ConsultantsContainer
      consultants={normalizedConsultants}
      currentPage={currentPage}
      pageSize={postPageSize}
      totalCount={total || 0}
    />
  );
}
