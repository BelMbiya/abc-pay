import type { Metadata } from "next";
import BienvenueLanding from "@/components/bienvenue/BienvenueLanding";

export const metadata: Metadata = {
  title: "ABC Pay — L'argent connecté en RDC : envoyer, recevoir, payer, encaisser",
  description:
    "ABC Pay, la plateforme de paiement pensée pour la RDC : envoyer, recevoir, payer un marchand, encaisser. Tuition règle la scolarité en 60 secondes — Airtel Money, Orange Money, M-Pesa, Africell, carte et virement.",
  openGraph: {
    title: "ABC Pay — The Connected Money",
    description:
      "Envoyer, recevoir, payer, encaisser en RDC. Tuition : la scolarité réglée en 60 secondes, imputée au bon matricule.",
    type: "website",
  },
};

export default function BienvenuePage() {
  return <BienvenueLanding />;
}
