import { ConsultantFormPage } from "@/app/dashboard/@components/consultant-form-page";

export async function generateMetadata() {
  return {
    title: "Create Consultant",
    description: "Admin dashboard for creating consultants.",
  };
}

export default function CreateConsultantPage() {
  return <ConsultantFormPage mode="create" />;
}
