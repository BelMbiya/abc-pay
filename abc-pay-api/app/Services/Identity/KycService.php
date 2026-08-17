<?php

namespace App\Services\Identity;

use App\Models\User;
use App\Services\Notification\NotificationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Domaine Identity — vérification KYC documentaire.
 * Les pièces (recto/verso de la pièce d'identité, selfie) sont stockées sur le disque
 * PRIVÉ `local` (storage/app/private/kyc/…) : jamais exposées par URL, servies en flux
 * uniquement à un administrateur authentifié. Revue manuelle (en attente → approuvé | rejeté).
 */
class KycService
{
    private const DISK = 'local';

    /** Colonnes de chemin ↔ clé de pièce. */
    private const DOCS = [
        'front' => 'kyc_id_front_path',
        'back' => 'kyc_id_back_path',
        'selfie' => 'kyc_selfie_path',
    ];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly OcrService $ocr,
    ) {}

    /**
     * Dépose les pièces d'un utilisateur (stockage privé), puis lance l'OCR SERVEUR sur le
     * recto (image réelle) et compare au profil déclaré :
     *  - correspondance forte (nom + n° de pièce) → KYC APPROUVÉ automatiquement ;
     *  - sinon (ou OCR indisponible) → « pending » → revue manuelle par un administrateur,
     *    à qui on présente le texte OCR + le verdict.
     * Le compte reste NON vérifié tant qu'il n'est pas approuvé (auto ou admin).
     *
     * @param  array<string, UploadedFile|null>  $files  clés : front | back | selfie
     */
    public function submit(User $user, array $files): void
    {
        $paths = [];
        foreach (self::DOCS as $key => $column) {
            $file = $files[$key] ?? null;
            if (! $file instanceof UploadedFile) {
                continue;
            }
            if ($user->{$column}) {
                Storage::disk(self::DISK)->delete($user->{$column}); // remplace l'ancienne
            }
            $paths[$column] = $file->storeAs("kyc/{$user->id}", $key.'.'.strtolower($file->extension()), self::DISK);
        }

        // OCR SERVEUR sur le recto (repli sur le verso si vide). Infalsifiable côté client.
        $frontPath = $paths['kyc_id_front_path'] ?? $user->kyc_id_front_path;
        $ocrText = $frontPath ? $this->ocr->extractText(Storage::disk(self::DISK)->path($frontPath)) : null;
        if ($ocrText === null && ($paths['kyc_id_back_path'] ?? null)) {
            $ocrText = $this->ocr->extractText(Storage::disk(self::DISK)->path($paths['kyc_id_back_path']));
        }

        $match = $this->ocrDiff($user, $ocrText)['match'];

        // La VALIDATION reste côté ADMIN (sécurité : humain dans la boucle pour l'identité).
        // Le dossier passe « en attente » ; l'OCR n'est qu'une aide à la décision présentée à l'admin.
        $user->forceFill($paths + [
            'kyc_status' => 'pending',
            'kyc_submitted_at' => now(),
            'kyc_reviewed_by' => null,
            'kyc_reviewed_at' => null,
            'kyc_reject_reason' => null,
            'kyc_ocr_text' => $ocrText !== null ? mb_substr($ocrText, 0, 4000) : null,
            'kyc_ocr_match' => $match,
        ])->save();
    }

    /**
     * Compare le texte OCR de la pièce aux infos DÉCLARÉES (nom + n° de pièce), de façon
     * tolérante (accents/casse/ponctuation ignorés). Vrai si tous les mots significatifs du
     * nom sont présents ET (n° de pièce absent OU retrouvé) — base d'une validation auto prudente.
     */
    /**
     * Compare le texte OCR aux infos DÉCLARÉES et DÉTAILLE les concordances/divergences,
     * afin que l'admin sache pourquoi c'est accepté ou refusé.
     *
     * @return array{match: bool|null, name_found: list<string>, name_missing: list<string>, doc_expected: ?string, doc_found: ?bool, summary: string}
     */
    public function ocrDiff(User $user, ?string $ocrText): array
    {
        $docExpected = $user->id_doc_number ?: null;
        if ($ocrText === null || trim($ocrText) === '') {
            return ['match' => null, 'name_found' => [], 'name_missing' => [], 'doc_expected' => $docExpected,
                'doc_found' => null, 'summary' => 'OCR indisponible ou pièce illisible — vérification manuelle requise.'];
        }

        // Compte ÉTABLISSEMENT : le « nom » du compte est celui de l'institution, pas du responsable —
        // comparer le nom n'a aucun sens (fausse divergence). On s'abstient et on invite à vérifier visuellement.
        if (\App\Models\EstablishmentStaff::where('user_id', $user->id)->exists()) {
            return ['match' => null, 'name_found' => [], 'name_missing' => [], 'doc_expected' => $docExpected, 'doc_found' => null,
                'summary' => 'Compte établissement — le nom du compte est celui de l\'institution ; vérifie visuellement la pièce d\'identité du responsable.'];
        }

        $norm = fn (string $s): string => strtolower(preg_replace('/[^a-z0-9 ]+/i', ' ', $this->stripAccents($s)) ?? '');
        $text = preg_replace('/\s+/', ' ', $norm($ocrText)) ?? '';
        $textCompact = preg_replace('/[^a-z0-9]/i', '', $text) ?? '';

        $tokens = array_values(array_filter(explode(' ', $norm((string) $user->name)), fn ($t) => strlen($t) >= 3));
        $found = [];
        $missing = [];
        foreach ($tokens as $t) {
            if (str_contains($text, $t)) {
                $found[] = $t;
            } else {
                $missing[] = $t;
            }
        }

        $docFound = null;
        if ($docExpected) {
            $doc = preg_replace('/[^a-z0-9]/i', '', strtolower($this->stripAccents($docExpected))) ?? '';
            $docFound = strlen($doc) >= 4 ? str_contains($textCompact, $doc) : null; // null = trop court pour décider
        }

        $nameOk = count($tokens) > 0 && count($missing) === 0;
        $docOk = $docFound !== false; // absent / indécidable = neutre
        $match = $nameOk && $docOk;

        $parts = [];
        $parts[] = count($tokens) === 0
            ? 'aucun nom déclaré à comparer'
            : ($missing ? 'mots du nom non retrouvés : '.implode(', ', $missing) : 'nom entièrement retrouvé');
        if ($docExpected) {
            $parts[] = $docFound === true ? 'n° de pièce retrouvé'
                : ($docFound === false ? 'n° de pièce non retrouvé' : 'n° de pièce trop court pour vérifier');
        }
        $summary = ($match ? 'Concordance — ' : 'Divergence — ').implode(' ; ', $parts).'.';

        return ['match' => $match, 'name_found' => $found, 'name_missing' => $missing,
            'doc_expected' => $docExpected, 'doc_found' => $docFound, 'summary' => $summary];
    }

    private function stripAccents(string $s): string
    {
        $out = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);

        return $out !== false ? $out : $s;
    }

    /** Décision de l'administrateur : approuve | rejette (avec motif). Notifie l'utilisateur. */
    public function review(User $user, string $decision, ?string $reason, string $by): void
    {
        $approved = $decision === 'approve';
        $user->forceFill([
            'kyc_status' => $approved ? 'approved' : 'rejected',
            'kyc_reviewed_by' => $by,
            'kyc_reviewed_at' => now(),
            'kyc_reject_reason' => $approved ? null : $reason,
        ])->save();

        $this->notifications->notify(
            $user->id, 'kyc', $approved ? 'success' : 'error',
            $approved ? 'Identité vérifiée' : 'Vérification d\'identité refusée',
            $approved
                ? 'Votre identité a été vérifiée avec succès.'
                : 'Votre vérification d\'identité a été refusée.'.($reason ? ' Motif : '.$reason : '').' Vous pouvez soumettre de nouvelles pièces.',
            ['kyc_status' => $user->kyc_status],
        );
    }

    /** Chemin privé d'une pièce (front|back|selfie) ou null. */
    public function documentPath(User $user, string $type): ?string
    {
        $column = self::DOCS[$type] ?? null;

        return $column ? $user->{$column} : null;
    }

    /**
     * Dossiers KYC pour l'admin. `$status` = pending|approved|rejected|null (tous les soumis).
     * Permet de revoir les pièces d'un compte AUSSI APRÈS validation/refus.
     */
    public function list(?string $status = null, int $limit = 200): array
    {
        $q = User::query()->whereNotNull('kyc_submitted_at');
        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $q->where('kyc_status', $status);
        } else {
            $q->whereIn('kyc_status', ['pending', 'approved', 'rejected']);
        }

        return $q->latest('kyc_submitted_at')->limit($limit)->get()
            ->map(fn (User $u) => $this->present($u, forAdmin: true))->all();
    }

    /** File des dossiers en attente (compat). */
    public function pending(int $limit = 200): array
    {
        return $this->list('pending', $limit);
    }

    /**
     * @param  bool  $forAdmin  true → inclut le verdict/texte OCR (revue admin) ; sinon payload
     *                          « self » minimal (L2 : ne pas divulguer l'OCR au titulaire du compte).
     * @return array<string, mixed>
     */
    public function present(User $user, bool $forAdmin = false): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'id_doc_type' => $user->id_doc_type,
            'id_doc_number' => $user->id_doc_number,
            'kyc_status' => $user->kyc_status,
            'kyc_submitted_at' => $user->kyc_submitted_at?->toIso8601String(),
            'has_front' => (bool) $user->kyc_id_front_path,
            'has_back' => (bool) $user->kyc_id_back_path,
            'has_selfie' => (bool) $user->kyc_selfie_path,
            'reject_reason' => $user->kyc_reject_reason,
        ];

        if ($forAdmin) {
            // Aide à la revue admin : verdict OCR + texte lu + DÉTAIL des concordances/divergences.
            $data['ocr_match'] = $user->kyc_ocr_match;
            $data['ocr_text'] = $user->kyc_ocr_text;
            $data['ocr_details'] = $this->ocrDiff($user, $user->kyc_ocr_text);
        }

        return $data;
    }
}
