import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

export interface ApiFeeType {
  id: string;
  name: string;
  frequency: string;
  optional: boolean;
}

/** Types de frais de l'établissement du staff connecté (route protégée). */
export async function fetchFeeTypes(): Promise<ApiFeeType[]> {
  return api.get<ApiFeeType[]>("/api/v1/staff/fee-types", { token: getStaffToken() ?? undefined });
}

export async function createFeeType(input: {
  name: string;
  frequency: string;
  optional: boolean;
}): Promise<ApiFeeType> {
  return api.post<ApiFeeType>("/api/v1/staff/fee-types", input, { token: getStaffToken() ?? undefined });
}

export interface ApiFeeSchedule {
  id: string;
  fee_type: string;
  frequency: string;
  group: string;
  amount: number;
  currency: string;
}

export async function fetchFeeSchedules(): Promise<ApiFeeSchedule[]> {
  return api.get<ApiFeeSchedule[]>("/api/v1/staff/fee-schedules", { token: getStaffToken() ?? undefined });
}

export async function createFeeSchedule(input: {
  fee_type_id: string;
  academic_group?: string;
  amount: number;
}): Promise<ApiFeeSchedule> {
  return api.post<ApiFeeSchedule>("/api/v1/staff/fee-schedules", input, { token: getStaffToken() ?? undefined });
}
