import { createFileRoute } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth.server";
import { generateCsvExport } from "@/lib/admin-ops.server";

export const Route = createFileRoute("/api/admin/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await getAdminSession();
        if (!admin) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (admin.role !== "owner" && !admin.permissions.includes("reports") && !admin.permissions.includes("finance")) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const url = new URL(request.url);
        const rawType = url.searchParams.get("type") || "revenue";
        const kind = (["revenue", "expenses", "members", "attendance"].includes(rawType) ? rawType : "revenue") as
          | "revenue"
          | "expenses"
          | "members"
          | "attendance";
        const from = url.searchParams.get("from") || undefined;
        const to = url.searchParams.get("to") || undefined;

        const csv = await generateCsvExport(kind, from, to);
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="fitness365-${kind}-report.csv"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
