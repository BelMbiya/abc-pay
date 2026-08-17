<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminStoreRequest;
use App\Http\Requests\AdminUpdateRequest;
use App\Models\Admin;
use App\Services\Identity\AdminRbac;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Gestion de l'ÉQUIPE d'administrateurs (comptes système). Réservé à `admins.manage`.
 * Garde-fous : on ne peut pas se rétrograder/désactiver/supprimer soi-même, ni retirer
 * le DERNIER super-administrateur (anti-verrouillage total de la plateforme).
 */
class AdminTeamController extends Controller
{
    public function index(): JsonResponse
    {
        $admins = Admin::query()->orderBy('created_at')->get()
            ->map(fn (Admin $a) => $this->row($a))->all();

        return response()->json(['data' => [
            'admins' => $admins,
            'roles' => collect(AdminRbac::roles())->map(fn ($r) => ['id' => $r, 'label' => AdminRbac::ROLE_LABELS[$r] ?? $r, 'permissions' => AdminRbac::permissionsFor($r)])->all(),
        ]]);
    }

    public function store(AdminStoreRequest $request): JsonResponse
    {
        $data = $request->validated();
        $admin = new Admin;
        $admin->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'], // haché par le cast
            'role' => $data['role'],
            'is_active' => true,
            'must_change_password' => true, // mot de passe provisoire → changement à la 1re connexion
        ])->save();

        return response()->json(['data' => $this->row($admin)], 201);
    }

    public function update(AdminUpdateRequest $request, Admin $admin): JsonResponse
    {
        $me = $request->user();
        $data = $request->validated();

        // Anti-verrouillage : pas de rétrogradation/désactivation de soi-même.
        if ($admin->id === $me->id && (array_key_exists('role', $data) && $data['role'] !== 'super_admin' || (array_key_exists('is_active', $data) && $data['is_active'] === false))) {
            throw ValidationException::withMessages(['admin' => 'Vous ne pouvez pas modifier votre propre rôle ni vous désactiver.']);
        }
        // Ne pas retirer le dernier super-admin actif.
        if ($admin->role === 'super_admin') {
            $demoting = (array_key_exists('role', $data) && $data['role'] !== 'super_admin') || (array_key_exists('is_active', $data) && $data['is_active'] === false);
            if ($demoting && Admin::where('role', 'super_admin')->where('is_active', true)->where('id', '!=', $admin->id)->count() === 0) {
                throw ValidationException::withMessages(['admin' => 'Impossible : il doit rester au moins un super-administrateur actif.']);
            }
        }

        $admin->fill(array_intersect_key($data, array_flip(['role', 'is_active'])))->save();

        return response()->json(['data' => $this->row($admin)]);
    }

    public function destroy(Request $request, Admin $admin): JsonResponse
    {
        $me = $request->user();
        if ($admin->id === $me->id) {
            throw ValidationException::withMessages(['admin' => 'Vous ne pouvez pas supprimer votre propre compte.']);
        }
        if ($admin->role === 'super_admin' && Admin::where('role', 'super_admin')->where('id', '!=', $admin->id)->count() === 0) {
            throw ValidationException::withMessages(['admin' => 'Impossible de supprimer le dernier super-administrateur.']);
        }
        $admin->delete();

        return response()->json(['data' => ['status' => 'deleted']]);
    }

    /** @return array<string, mixed> */
    private function row(Admin $a): array
    {
        return [
            'id' => $a->id,
            'name' => $a->name,
            'email' => $a->email,
            'role' => $a->role,
            'role_label' => AdminRbac::ROLE_LABELS[$a->role] ?? $a->role,
            'is_active' => (bool) $a->is_active,
            'must_change_password' => (bool) $a->must_change_password,
            'created_at' => $a->created_at?->toIso8601String(),
        ];
    }
}
