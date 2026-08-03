<?php

namespace App\Services\Identity;

use App\Models\EstablishmentStaff;
use App\Models\FraudFlag;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\Exceptions\UserActionException;
use Illuminate\Support\Facades\DB;

/**
 * Domaine Identity — gestion des comptes utilisateurs par le super-admin.
 * Lecture (liste/détail), changement de statut (bloquer / débloquer / déconnexion
 * forcée) et suppression contrôlée. SRP : hors contrôleur.
 */
class UserManagementService
{
    /** Liste des comptes avec statut + volumétrie (recherche nom / téléphone / e-mail). */
    public function list(?string $search = null, int $limit = 300): array
    {
        $staffIds = EstablishmentStaff::query()->pluck('user_id')->unique()->flip();

        $users = User::query()
            ->when($search, fn ($q, $s) => $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%");
            }))
            ->withCount('transactions')
            ->latest()
            ->limit($limit)
            ->get();

        return $users->map(fn (User $u) => $this->row($u, $staffIds->has($u->id)))->all();
    }

    /**
     * Crée un compte utilisateur (particulier) par l'admin. Le titulaire se connecte
     * ensuite par OTP (aucun mot de passe). Champs d'identité facultatifs.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): array
    {
        $user = new User;
        $user->phone = $data['phone'];
        $user->name = $data['name'] ?? null;
        $user->email = $data['email'] ?? null;
        $user->save();

        return $this->show($user);
    }

    /** Détail d'un compte + dernières transactions + signalements de fraude. */
    public function show(User $user): array
    {
        $isStaff = EstablishmentStaff::where('user_id', $user->id)->exists();

        $txs = Transaction::where('user_id', $user->id)->latest()->limit(20)
            ->get(['id', 'type', 'amount', 'currency', 'status', 'channel', 'counterparty_name', 'counterparty_phone', 'created_at'])
            ->map(fn ($t) => [
                'id' => $t->id, 'type' => $t->type, 'amount' => (float) $t->amount, 'currency' => $t->currency,
                'status' => $t->status, 'channel' => $t->channel,
                'counterparty_name' => $t->counterparty_name, 'counterparty_phone' => $t->counterparty_phone,
                'created_at' => $t->created_at?->toIso8601String(),
            ])->all();

        $flags = FraudFlag::where('user_id', $user->id)->latest()->limit(20)
            ->get(['id', 'rule', 'severity', 'score', 'reason', 'status', 'created_at'])
            ->map(fn ($f) => [
                'id' => $f->id, 'rule' => $f->rule, 'severity' => $f->severity, 'score' => $f->score,
                'reason' => $f->reason, 'status' => $f->status, 'created_at' => $f->created_at?->toIso8601String(),
            ])->all();

        return array_merge($this->row($user->loadCount('transactions'), $isStaff), [
            'birth_date' => $user->birth_date?->toDateString(),
            'gender' => $user->gender,
            'address' => $user->address,
            'city' => $user->city,
            'id_doc_type' => $user->id_doc_type,
            'id_doc_number' => $user->id_doc_number,
            'blocked_reason' => $user->blocked_reason,
            'transactions' => $txs,
            'fraud_flags' => $flags,
        ]);
    }

    /** Bloque un compte (gel total : plus aucune opération ni renouvellement de session). */
    public function block(User $user, ?string $reason = null): array
    {
        // Affectation explicite : champs hors allowlist (anti mass-assignment).
        $user->is_blocked = true;
        $user->blocked_reason = $reason ?: 'Compte bloqué par un administrateur.';
        $user->save();

        return $this->show($user->fresh());
    }

    public function unblock(User $user): array
    {
        $user->is_blocked = false;
        $user->blocked_reason = null;
        $user->save();

        return $this->show($user->fresh());
    }

    /** Déconnexion forcée : révoque toutes les sessions (jetons antérieurs refusés). */
    public function disconnect(User $user): array
    {
        $user->sessions_revoked_at = now();
        $user->save();

        return $this->show($user->fresh());
    }

    /**
     * Supprime un compte SANS transaction (intégrité des registres financiers).
     * Un compte avec historique ne peut être supprimé : on bloque à la place.
     *
     * @throws UserActionException
     */
    public function delete(User $user): void
    {
        if (Transaction::where('user_id', $user->id)->exists()) {
            throw new UserActionException('Ce compte a un historique de transactions et ne peut être supprimé. Bloque-le à la place.');
        }

        DB::transaction(function () use ($user) {
            EstablishmentStaff::where('user_id', $user->id)->delete();
            FraudFlag::where('user_id', $user->id)->update(['user_id' => null]);
            $user->delete();
        });
    }

    /** DTO liste (statut + volumétrie). */
    private function row(User $u, bool $isStaff): array
    {
        $status = $u->is_blocked ? 'blocked' : 'active';

        return [
            'id' => $u->id,
            'name' => $u->name,
            'phone' => $u->phone,
            'email' => $u->email,
            'role' => $isStaff ? 'etablissement' : 'particulier',
            'kyc_complete' => $u->hasCompleteKyc(),
            'is_blocked' => (bool) $u->is_blocked,
            'status' => $status,
            'transactions_count' => (int) ($u->transactions_count ?? 0),
            'sessions_revoked_at' => $u->sessions_revoked_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
