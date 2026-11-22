import { ProfessionFormPage } from "@/app/dashboard/@components/profession-form-page";

export async function generateMetadata() {
  return {
    title: "Create Profession",
    description: "Admin dashboard for creating professions.",
  };
}

export default function CreateProfessionPage() {
  return <ProfessionFormPage mode="create" />;
}
