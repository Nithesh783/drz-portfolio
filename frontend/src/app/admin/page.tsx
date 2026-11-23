import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const initialTab =
    tab === "homepage" || tab === "enquiries" ? tab : "projects";

  const cookie = (await cookies()).get("portfolio_admin");
  if (!cookie) redirect("/admin/login");

  const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/admin/auth/me`,
    {
      headers: { Cookie: `portfolio_admin=${cookie.value}` },
      cache: "no-store",
    },
  );
  if (response.status === 401) redirect("/admin/login");
  if (!response.ok) {
    throw new Error(`Admin authentication API returned HTTP ${response.status}.`);
  }

  return <AdminDashboard initialTab={initialTab} />;
}
