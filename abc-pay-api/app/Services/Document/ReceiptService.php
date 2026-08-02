<?php

namespace App\Services\Document;

use App\Models\Receipt;
use App\Models\Transaction;
use Illuminate\Support\Str;

/**
 * Domaine Document — émission des reçus.
 * SRP : la génération d'un reçu (numérotation + jeton QR) est isolée ici,
 * hors du service de paiement et du contrôleur.
 */
class ReceiptService
{
    public function issueFor(Transaction $transaction): Receipt
    {
        return Receipt::create([
            'transaction_id' => $transaction->id,
            'number' => $this->nextNumber(),
            'qr_token' => Str::random(48),
        ]);
    }

    /** Numérotation séquentielle RC-AAAA-NNNNN. */
    private function nextNumber(): string
    {
        return 'RC-'.now()->format('Y').'-'.str_pad((string) (Receipt::count() + 1), 5, '0', STR_PAD_LEFT);
    }
}
