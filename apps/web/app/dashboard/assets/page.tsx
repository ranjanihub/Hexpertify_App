"use server";
import { ISearchParams } from "@/app/typrs";
import { listAssets } from "./actions";
import AssetsContainer from "./container";

interface Image {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}
export async function generateMetadata() {
  return {
    title: "Assets",
    description: "Admin dashboard for managing assets.",
  };
}
export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) {
  const { page, pageSize, search, category } = (await searchParams) || {};

  const currentPage = parseInt(page || "1", 10);
  const postPageSize = parseInt(pageSize || "10", 10);
  const { items, total } = await listAssets(
    currentPage,
    postPageSize,
    search,
    category as any,
  );

  return (
    <main className=" bg-background p-8">
      <AssetsContainer
        images={items}
        currentPage={currentPage}
        pageSize={postPageSize}
        totalCount={total}
        initialSearch={search}
        initialCategory={category}
      />
    </main>
  );
}
