import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLoginView } from "@/components/admin/AdminLoginView";
import { adminMeFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async ({ context }) => {
    const { admin } = await context.queryClient.fetchQuery({
      queryKey: ["admin-me"],
      queryFn: () => adminMeFn(),
      staleTime: 60_000,
    });
    if (admin) throw redirect({ to: "/admin" });
  },
  component: AdminLoginView,
});
