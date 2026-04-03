import { redirect } from "next/navigation";
import { UploadWorkbench } from "@/components/upload-workbench";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function UploadPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: producer } = await supabase
    .from("producers")
    .select("name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const name =
    (producer as { name?: string } | null)?.name?.trim() || "Producer";
  const verified =
    ((producer as { status?: string } | null)?.status ?? "").toLowerCase() ===
    "verified";

  return (
    <UploadWorkbench producerName={name} verified={verified} />
  );
}
