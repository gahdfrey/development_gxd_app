import { auth } from "@/auth";

export async function getOrgId(): Promise<number | null> {
  const session = await auth();
  const orgId = session?.user?.organisationId;
  return orgId ? Number(orgId) : null;
}
