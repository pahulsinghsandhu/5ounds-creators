import { UploadWorkbench } from "@/components/upload-workbench";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "Producer";
  let verified = false;

  if (user) {
    const { data: producer } = await supabase
      .from("producers")
      .select("name, status")
      .eq("user_id", user.id)
      .maybeSingle();
    name =
      (producer as { name?: string } | null)?.name?.trim() || "Producer";
    verified =
      ((producer as { status?: string } | null)?.status ?? "").toLowerCase() ===
      "verified";
  }

  return (
    <UploadWorkbench producerName={name} verified={verified} />
  );
}
