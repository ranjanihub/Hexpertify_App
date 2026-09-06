import { prisma } from "@/lib/prisma";
import PageBuilderForm from "./@components/page-builder-form";

export async function generateMetadata() {
  return {
    title: "Dashboard",
    template: "Dashboard - %s",
    description: "Admin dashboard for managing   pages.",
  };
}

export default async function DashboardPage() {
  const pageData = await prisma.page.findUnique({
    where: { identifier: "home" },
    include: {
      seoMeta: true,
    },
  });

  return <PageBuilderForm initialData={pageData} />;
}
