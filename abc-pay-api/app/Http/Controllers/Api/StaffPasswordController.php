<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StaffPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/** Changement de mot de passe du compte staff (lève le gate `must_change_password`). */
class StaffPasswordController extends Controller
{
    public function update(StaffPasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (! $user->password || ! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Mot de passe actuel incorrect.']);
        }

        // Le cast `hashed` du modèle hache la nouvelle valeur ; on lève le drapeau (hors allowlist).
        $user->forceFill([
            'password' => $data['new_password'],
            'must_change_password' => false,
        ])->save();

        return response()->json(['data' => ['status' => 'changed']]);
    }
}
