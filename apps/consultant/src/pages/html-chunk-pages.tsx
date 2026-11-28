import { FileCode } from "lucide-react";
import { PageHeader } from "@/components/page-header";

/**
 * The server has no /api/html-chunks endpoints, so custom chunk pages can't be listed, created,
 * published or deleted from this panel. The page says so plainly instead of showing a list that
 * can never load (and buttons that would silently do nothing).
 */
export default function HtmlChunkPages() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="HTML Chunk Pages"
        description="Custom chunk-based landing pages."
        icon={<FileCode className="w-4 h-4 text-purple-200" />}
        badge="PAGES"
      />

      <div className="bg-white rounded-2xl border border-dashed border-border shadow-sm py-16 px-6 text-center">
        <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-bold text-gray-900">Custom pages aren't available yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
          Creating and publishing custom pages from the therapist panel isn't supported right now. If you need a page
          added or changed, please contact the admin team.
        </p>
      </div>
    </div>
  );
}
