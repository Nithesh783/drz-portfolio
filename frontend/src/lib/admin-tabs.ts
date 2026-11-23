export const adminTabs = ["homepage", "projects", "enquiries"] as const;
export type AdminTab = (typeof adminTabs)[number];

export const defaultAdminTab: AdminTab = "homepage";
export const adminDashboardHref = `/admin/?tab=${defaultAdminTab}`;

export function parseAdminTab(
  value: string | string[] | null | undefined,
): AdminTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return adminTabs.find((candidate) => candidate === tab) ?? defaultAdminTab;
}
