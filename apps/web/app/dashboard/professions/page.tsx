import React from "react";
import ProfessionsContainer from "./container";
import { ISearchParams } from "@/app/typrs";
import { listProfessions } from "./actions";
import dayjs from "dayjs";

export async function generateMetadata() {
  return {
    title: "Professions",
    description: "Admin dashboard for managing professions.",
  };
}
export default async function ProfessionsPage({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) {
  const { page, pageSize } = (await searchParams) || {};

  const currentPage = parseInt(page || "1", 10);
  const postPageSize = parseInt(pageSize || "5", 10);
  const { items, total } = await listProfessions(currentPage, postPageSize);
  const normalizedItems = (items || []).map((p) => ({
    ...p,
    imageUrl: p.imageUrl ?? undefined,
    createdAt: dayjs(p.createdAt).format("YYYY-MM-DD HH:mm:ss"),
  }));
  return (
    <div>
      <ProfessionsContainer
        professions={normalizedItems}
        currentPage={currentPage}
        pageSize={postPageSize}
        totalCount={total || 0}
      />
    </div>
  );
}
