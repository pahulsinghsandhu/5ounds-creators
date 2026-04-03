import { UploadWorkbench } from "@/components/upload-workbench";

export const dynamic = "force-dynamic";

/** No server auth gate — preview uses static labels; real session is optional client-side. */
export default function UploadPage() {
  return (
    <UploadWorkbench producerName="Preview producer" verified />
  );
}
