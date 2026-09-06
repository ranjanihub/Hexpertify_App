import { ProfessionFormPage } from "@/app/dashboard/@components/profession-form-page";

export async function generateMetadata() {
  return {
    title: "Edit Profession",
    description: "Admin dashboard for editing professions.",
  };
}

export default function EditProfessionPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProfessionFormPage mode="edit" professionId={params.id} />;
}
