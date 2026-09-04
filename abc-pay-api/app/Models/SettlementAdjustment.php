<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Reprise (clawback) sur reversement : remboursement d'une transaction DÉJÀ reversée.
 * `amount` positif = montant que l'établissement doit rendre. `settlement_id` null =
 * reprise en attente (déduite du prochain reversement) ; posé = appliquée.
 */
class SettlementAdjustment extends Model
{
    use HasUuids;

    protected $fillable = [
        'establishment_id', 'transaction_id', 'refund_id',
        'amount', 'currency', 'reason', 'settlement_id',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }
}
