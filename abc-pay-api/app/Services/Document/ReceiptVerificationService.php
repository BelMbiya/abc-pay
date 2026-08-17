<?php

namespace App\Services\Document;

use App\Models\Receipt;

/**
 * Domaine Document — vérification d'authenticité d'un reçu (anti-fraude).
 *
 * Politique : le serveur est la seule source de vérité. Un reçu est authentique
 * s'il porte un `qr_token` connu (48 car. aléatoires, infalsifiable). Le numéro
 * (séquentiel, prévisible) n'authentifie JAMAIS seul ; la saisie manuelle exige
 * donc numéro + code court (préfixe du jeton, imprimé sur le reçu). La réponse
 * est minimale et masque les données personnelles (RGPD/confidentialité).
 */
class ReceiptVerificationService
{
    /** Longueur du code court imprimé (préfixe du qr_token) pour la saisie manuelle. */
    public const MANUAL_CODE_LENGTH = 8;

    /** Vérifie via le jeton complet (lu depuis le QR). */
    public function verifyByToken(string $token): ?array
    {
        $receipt = Receipt::with('transaction.establishment')->where('qr_token', $token)->first();

        return $receipt ? $this->present($receipt) : null;
    }

    /** Vérifie via numéro + code court (saisie manuelle quand le scan échoue). */
    public function verifyByNumberAndCode(string $number, string $code): ?array
    {
        $receipt = Receipt::with('transaction.establishment')->where('number', $number)->first();
        if (! $receipt) {
            return null;
        }
        // Comparaison en temps constant du préfixe attendu.
        $expected = self::manualCode($receipt->qr_token);
        if (! hash_equals($expected, strtoupper($code))) {
            return null;
        }

        return $this->present($receipt);
    }

    /** Code court à imprimer sur le reçu (dérivé du jeton) pour la vérification manuelle. */
    public static function manualCode(string $qrToken): string
    {
        return strtoupper(substr($qrToken, 0, self::MANUAL_CODE_LENGTH));
    }

    /** DTO de sortie — uniquement ce qui figure déjà sur le reçu, PII masquée. */
    private function present(Receipt $receipt): array
    {
        $t = $receipt->transaction;

        return [
            'number' => $receipt->number,
            'status' => $t->status,               // confirmee | annulee | remboursee | echouee
            'type' => $t->type,                   // tuition | send | service
            'establishment' => $t->establishment?->name,
            'student_name' => $this->maskName($t->student_name),
            'student_matricule' => $this->maskMatricule($t->student_matricule),
            'fee_type' => $t->fee_type,
            'amount' => (float) $t->amount,
            'currency' => $t->currency,
            'channel' => $t->channel,
            'date' => optional($t->confirmed_at ?? $t->created_at)->toIso8601String(),
        ];
    }

    /** « Ilunga Mbuyi Grace » → « Ilunga M. G. » (assez pour comparer, pas pour ficher). */
    private function maskName(?string $name): ?string
    {
        if (! $name) {
            return null;
        }
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $first = array_shift($parts);
        $initials = array_map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)).'.', $parts);

        return trim($first.' '.implode(' ', $initials));
    }

    /** « ISC-2026-0001 » → « ISC••••••••01 » (3 premiers + 2 derniers visibles). */
    private function maskMatricule(?string $matricule): ?string
    {
        if (! $matricule) {
            return null;
        }
        $len = mb_strlen($matricule);
        if ($len <= 4) {
            return $matricule;
        }

        return mb_substr($matricule, 0, 3).str_repeat('•', $len - 5).mb_substr($matricule, -2);
    }
}
