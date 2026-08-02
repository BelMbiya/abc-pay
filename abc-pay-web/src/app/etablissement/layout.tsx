import type { ReactNode } from "react";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { StaffGate } from "@/components/backoffice/StaffGate";

export default function EtablissementLayout({ children }: { children: ReactNode }) {
  return (
    <StaffGate>
      <BackofficeShell>{children}</BackofficeShell>
    </StaffGate>
  );
}
