import { Head } from "@/components/ui";
import UploadFlow from "./UploadFlow";

export default function Upload() {
  return <>
    <Head title="Upload a sheet" intro="Bring in sales, attendance, receivables or hiring data from Excel or CSV. Tally reports exported to Excel work too." />
    <UploadFlow />
    <p className="muted">No attendance sheet yet? Start from the <a href="/templates/attendance-template.xlsx">attendance template</a>.</p>
  </>;
}
