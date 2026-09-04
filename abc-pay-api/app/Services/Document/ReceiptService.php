<?php

namespace App\Services\Document;

use App\Models\Receipt;
use App\Models\Transaction;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Domaine Document — émission des reçus.
 * SRP : la génération d'un reçu (numérotation + jeton QR) est isolée ici,
 * hors du service de paiement et du contrôleur.
 */
class ReceiptService
{
    public function issueFor(Transaction $transaction): Receipt
    {
        // IDEMPOTENT : un seul reçu par transaction (re-confirmation / rejeu → même reçu).
        $existing = Receipt::where('transaction_id', $transaction->id)->first();
        if ($existing) {
            return $existing;
        }

        // Numéro séquentiel + RETRY sur collision (contrainte UNIQUE) : robuste aux courses
        // et aux trous de séquence (suppressions) — contrairement à un simple count()+1.
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            try {
                return Receipt::create([
                    'transaction_id' => $transaction->id,
                    'number' => $this->nextNumber(),
                    'qr_token' => Str::random(48),
                ]);
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt === 5) {
                    throw $e;
                }
                // numéro déjà pris (course) → on retente avec le suivant
            }
        }

        throw new RuntimeException('Impossible de générer un numéro de reçu unique.');
    }

    /**
     * Numérotation séquentielle RC-AAAA-NNNNN, dérivée du PLUS GRAND numéro de l'année en
     * cours (et non d'un count()) : insensible aux suppressions / trous de séquence.
     */
    private function nextNumber(): string
    {
        $prefix = 'RC-'.now()->format('Y').'-';
        $max = Receipt::where('number', 'like', $prefix.'%')->max('number');
        $seq = $max !== null ? ((int) substr($max, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
