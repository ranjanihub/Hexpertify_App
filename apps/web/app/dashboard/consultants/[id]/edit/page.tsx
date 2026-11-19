import { ConsultantFormPage } from "@/app/dashboard/@components/consultant-form-page";

interface EditConsultantPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata() {
  return {
    title: "Edit Consultant",
    description: "Admin dashboard for editing consultants.",
  };
}

export default async function EditConsultantPage({
  params,
}: EditConsultantPageProps) {
  const { id } = await params;
  return <ConsultantFormPage mode="edit" consultantId={id} />;
}
