import {
  Church, Home, Smartphone, Car, Utensils, Stethoscope, ShoppingCart, Scissors, Plane, Landmark, Briefcase,
  Gift, HeartHandshake, Users, Hammer, Zap, Droplet, Building2, Building, Wifi, Tv, Send, Bike, Fuel, MapPin,
  Ticket, ShoppingBasket, Cross, ShieldPlus, Shirt, SmartphoneCharging, Sofa, Bed, CarFront, FileText, Wallet, Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface PayItem {
  label: string;
  sub: string;
  icon: LucideIcon;
  live: boolean;
}

export interface PayCategory {
  key: string;
  title: string;
  icon: LucideIcon;
  items: PayItem[];
}

/** 11 catégories de paiement — reprises du prototype MVP. */
export const categories: PayCategory[] = [
  { key: "eglise", title: "Église & Spiritualité", icon: Church, items: [
    { label: "Dîme personnelle", sub: "Paroisse / église", icon: Church, live: true },
    { label: "Offrande personnelle", sub: "Paroisse / église", icon: Gift, live: true },
    { label: "Collectes & contributions", sub: "Mariage, funérailles, tontine…", icon: HeartHandshake, live: true },
    { label: "Soutien aux membres", sub: "Caisse d'entraide", icon: Users, live: true },
    { label: "Projet de construction", sub: "Fonds de bâtisse", icon: Hammer, live: false },
  ] },
  { key: "maison", title: "Maison & Factures", icon: Home, items: [
    { label: "Électricité", sub: "SNEL", icon: Zap, live: true },
    { label: "Eau", sub: "REGIDESO", icon: Droplet, live: true },
    { label: "Loyer", sub: "Prélèvement mensuel", icon: Building2, live: false },
    { label: "Charges de copropriété", sub: "Syndic / gestion immeuble", icon: Building, live: false },
  ] },
  { key: "telecom", title: "Téléphonie & Numérique", icon: Smartphone, items: [
    { label: "Crédit téléphone", sub: "Forfait mobile", icon: Smartphone, live: true },
    { label: "Internet", sub: "ABC Fibre", icon: Wifi, live: true },
    { label: "Télévision", sub: "Bouquet & abonnement", icon: Tv, live: true },
    { label: "Envoyer du crédit", sub: "À un proche", icon: Send, live: true },
    { label: "Cartes cadeaux numériques", sub: "Google Play, App Store...", icon: Gift, live: false },
  ] },
  { key: "transport", title: "Transport & Mobilité", icon: Car, items: [
    { label: "Taxi", sub: "Course en ville", icon: Car, live: true },
    { label: "Moto-taxi", sub: "Wewa", icon: Bike, live: true },
    { label: "Carburant", sub: "Station-service", icon: Fuel, live: false },
    { label: "Péage & parking", sub: "Voirie urbaine", icon: MapPin, live: false },
    { label: "Billets bus / avion / bateau", sub: "Réservation & voyage", icon: Ticket, live: false },
  ] },
  { key: "alimentation", title: "Alimentation & Restaurants", icon: Utensils, items: [
    { label: "Restaurant", sub: "Marchand QR", icon: Utensils, live: true },
    { label: "Livraison de repas", sub: "Coursier partenaire", icon: Bike, live: false },
    { label: "Marché & épicerie", sub: "Courses du quotidien", icon: ShoppingBasket, live: false },
  ] },
  { key: "sante", title: "Santé & Bien-être", icon: Stethoscope, items: [
    { label: "Consultation / hôpital", sub: "Frais de consultation", icon: Stethoscope, live: false },
    { label: "Pharmacie", sub: "Achat de médicaments", icon: Cross, live: false },
    { label: "Mutuelle / assurance santé", sub: "Cotisation mensuelle", icon: ShieldPlus, live: false },
  ] },
  { key: "shopping", title: "Shopping & Commerce", icon: ShoppingCart, items: [
    { label: "Supermarché", sub: "Marchand QR", icon: ShoppingCart, live: true },
    { label: "Boutiques & mode", sub: "Vêtements & accessoires", icon: Shirt, live: false },
    { label: "Électronique & téléphones", sub: "High-tech", icon: SmartphoneCharging, live: false },
    { label: "Meubles & maison", sub: "Équipement du foyer", icon: Sofa, live: false },
  ] },
  { key: "beaute", title: "Beauté & Style", icon: Scissors, items: [
    { label: "Salon de coiffure / barbier", sub: "Rendez-vous & prestations", icon: Scissors, live: false },
    { label: "Institut de beauté", sub: "Soins & esthétique", icon: Sparkles, live: false },
  ] },
  { key: "voyage", title: "Hôtellerie & Voyage", icon: Plane, items: [
    { label: "Hôtel", sub: "Réservation de chambre", icon: Bed, live: false },
    { label: "Location de voiture", sub: "Véhicule avec ou sans chauffeur", icon: CarFront, live: false },
  ] },
  { key: "admin", title: "Administration publique", icon: Landmark, items: [
    { label: "Impôts & taxes", sub: "DGI & régies financières", icon: Landmark, live: false },
    { label: "Amendes & permis", sub: "Documents administratifs", icon: FileText, live: false },
  ] },
  { key: "business", title: "Business & Professionnels", icon: Briefcase, items: [
    { label: "Paiement fournisseurs / salaires", sub: "Gestion de trésorerie", icon: Wallet, live: false },
    { label: "Facturation clients", sub: "Encaissement professionnel", icon: FileText, live: false },
    { label: "Gestion des employés", sub: "Paie & primes", icon: Users, live: false },
  ] },
];

/** Moyens mobile money (pour les flux Send / Scan / Pay). */
export const mobileMethods = [
  { id: "mpesa", title: "M-Pesa", sub: "Vodacom" },
  { id: "airtel", title: "Airtel Money", sub: "Airtel" },
  { id: "orange", title: "Orange Money", sub: "Orange" },
  { id: "africell", title: "Africell Money", sub: "Africell" },
];
