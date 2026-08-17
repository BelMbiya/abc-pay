<?php

namespace App\Services\Tenancy;

use App\Models\Establishment;

/**
 * Catalogue des documents KYB exigés d'un MARCHAND / établissement en RDC.
 *
 * Source : procédure de création d'entreprise RDC (Guichet Unique de Création
 * d'Entreprise — GUCE) + exigences KYB des prestataires de paiement agréés BCC.
 * L'agrément BCC est au niveau PLATEFORME (abc pay) ; le marchand, lui, fournit
 * ces pièces d'entreprise. Les établissements scolaires ajoutent l'agrément du
 * ministère de tutelle (EPST pour maternelle→secondaire, ESU pour le supérieur).
 */
class EstablishmentDocuments
{
    /**
     * @var array<string, array{label: string, required: bool, scope: string, needs_number: bool, hint: string}>
     */
    public const CATALOG = [
        'rccm' => [
            'label' => 'RCCM — Registre du Commerce et du Crédit Mobilier',
            'required' => true, 'scope' => 'all', 'needs_number' => true,
            'hint' => "Numéro d'immatriculation au registre du commerce (greffe du Tribunal de commerce).",
        ],
        'id_nat' => [
            'label' => "Numéro d'Identification Nationale (Id. Nat.)",
            'required' => true, 'scope' => 'all', 'needs_number' => true,
            'hint' => "Identifiant national de l'entité, délivré par le Ministère de l'Économie.",
        ],
        'nif' => [
            'label' => "NIF — Numéro d'Identification Fiscale",
            'required' => true, 'scope' => 'all', 'needs_number' => true,
            'hint' => 'Identifiant fiscal délivré par la DGI.',
        ],
        'proof_address' => [
            'label' => "Preuve du siège de l'établissement",
            'required' => true, 'scope' => 'all', 'needs_number' => false,
            'hint' => 'Contrat de bail, titre de propriété ou attestation de siège.',
        ],
        'manager_id' => [
            'label' => "Pièce d'identité du responsable légal",
            'required' => true, 'scope' => 'all', 'needs_number' => false,
            'hint' => "Passeport, carte d'électeur ou permis du chef d'établissement / promoteur / recteur.",
        ],
        'ministry_approval' => [
            'label' => "Arrêté d'agrément / autorisation de fonctionnement",
            'required' => true, 'scope' => 'school', 'needs_number' => true,
            'hint' => "Agrément du ministère de tutelle : EPST (maternelle→secondaire) ou ESU (supérieur/université).",
        ],
    ];

    /** La plateforme ne sert que des établissements éducatifs (école / institut / université). */
    public static function isSchool(Establishment $establishment): bool
    {
        return in_array($establishment->level, ['petit', 'secondaire', 'superieur'], true);
    }

    /** Ministère de tutelle selon le niveau (agrément ministry_approval). */
    public static function ministryFor(Establishment $establishment): string
    {
        return $establishment->level === 'superieur' ? 'ESU' : 'EPST';
    }

    /**
     * Clés de documents APPLICABLES à un établissement (retire les documents « school »
     * pour un marchand non scolaire).
     *
     * @return list<string>
     */
    public static function applicableKeys(Establishment $establishment): array
    {
        $school = self::isSchool($establishment);

        return array_keys(array_filter(
            self::CATALOG,
            fn (array $doc) => $doc['scope'] === 'all' || ($doc['scope'] === 'school' && $school),
        ));
    }

    /**
     * Clés de documents OBLIGATOIRES pour un établissement.
     *
     * @return list<string>
     */
    public static function requiredKeys(Establishment $establishment): array
    {
        return array_values(array_filter(
            self::applicableKeys($establishment),
            fn (string $key) => self::CATALOG[$key]['required'],
        ));
    }
}
