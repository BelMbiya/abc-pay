import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

export interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface NewStaffMember {
  name: string;
  email: string;
  role: string;
  password: string;
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  return api.get<StaffMember[]>("/api/v1/staff/members", { token: getStaffToken() ?? undefined });
}

export async function inviteStaffMember(input: NewStaffMember): Promise<StaffMember> {
  return api.post<StaffMember>("/api/v1/staff/members", input, { token: getStaffToken() ?? undefined });
}
