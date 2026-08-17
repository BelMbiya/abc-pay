<?php

namespace App\Services\Tenancy;

use App\Models\Establishment;
use App\Models\EstablishmentDocument;

/**
 * Domaine Tenancy — gestion des documents KYB d'un établissement (RDC).
 * Croise le CATALOGUE (ce qui est exigé) avec les pièces FOURNIES, et calcule la
 * complétude (tous les documents obligatoires approuvés). Hors contrôleur (DDD).
 */
class EstablishmentDocumentService
{
    /**
     * Aperçu complet : pour chaque document APPLICABLE, son exigence et son état
     * (fourni / numéro / statut de revue), plus un résumé de complétude.
     *
     * @return array<string, mixed>
     */
    public function overview(Establishment $establishment): array
    {
        $applicable = EstablishmentDocuments::applicableKeys($establishment);
        $provided = $establishment->documents()->get()->keyBy('type');

        $items = [];
        foreach ($applicable as $key) {
            $meta = EstablishmentDocuments::CATALOG[$key];
            $doc = $provided->get($key);
            // Précise le ministère de tutelle (EPST/ESU) sur la ligne d'agrément.
            $label = $key === 'ministry_approval'
                ? $meta['label'].' — '.EstablishmentDocuments::ministryFor($establishment)
                : $meta['label'];
            $items[] = [
                'type' => $key,
                'label' => $label,
                'hint' => $meta['hint'],
                'required' => $meta['required'],
                'needs_number' => $meta['needs_number'],
                'provided' => $doc !== null,
                'number' => $doc?->number,
                'status' => $doc?->status ?? 'missing',
                'note' => $doc?->note,
            ];
        }

        return [
            'items' => $items,
            'completeness' => $this->completeness($establishment),
        ];
    }

    /**
     * Complétude KYB : tous les documents OBLIGATOIRES applicables sont-ils approuvés ?
     *
     * @return array{required: int, approved: int, complete: bool, missing: list<string>}
     */
    public function completeness(Establishment $establishment): array
    {
        $required = EstablishmentDocuments::requiredKeys($establishment);
        $approved = $establishment->documents()
            ->where('status', 'approved')
            ->pluck('type')
            ->all();

        $missing = array_values(array_diff($required, $approved));

        return [
            'required' => count($required),
            'approved' => count(array_intersect($required, $approved)),
            'complete' => $missing === [],
            'missing' => $missing,
        ];
    }

    /**
     * Crée ou met à jour une pièce (numéro / fichier / statut de revue). Le `type`
     * doit appartenir au catalogue applicable à l'établissement.
     *
     * @param  array<string, mixed>  $data
     */
    public function upsert(Establishment $establishment, string $type, array $data): EstablishmentDocument
    {
        $attrs = [];
        foreach (['number', 'file_path', 'status', 'note'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== null) {
                $attrs[$field] = $data[$field];
            }
        }
        // On n'horodate une REVUE que sur une vraie décision (approved/rejected) — pas
        // sur un simple (re)dépôt par l'établissement, qui repasse la pièce en « pending ».
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'], true)) {
            $attrs['reviewed_by'] = $data['reviewed_by'] ?? null;
            $attrs['reviewed_at'] = now();
        }

        return EstablishmentDocument::updateOrCreate(
            ['establishment_id' => $establishment->id, 'type' => $type],
            $attrs,
        );
    }
}
