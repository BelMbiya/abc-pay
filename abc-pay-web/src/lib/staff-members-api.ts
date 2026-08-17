import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

export interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  return api.get<StaffMember[]>("/api/v1/staff/members", { token: getStaffToken() ?? undefined });
}
