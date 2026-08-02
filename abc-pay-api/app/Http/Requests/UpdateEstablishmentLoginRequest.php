<?php

namespace App\Http\Requests;

use App\Models\EstablishmentStaff;
use Illuminate\Validation\Rule;

class UpdateEstablishmentLoginRequest extends SecureFormRequest
{
    // Route protégée par le middleware 'admin'.
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $establishment = $this->route('establishment');
        $establishmentId = is_object($establishment) ? $establishment->id : $establishment;

        // Compte direction actuel (à ignorer pour la contrainte d'unicité de l'email).
        $currentUserId = EstablishmentStaff::where('establishment_id', $establishmentId)
            ->where('role', 'direction')->value('user_id');

        return [
            'login_email' => ['sometimes', 'email', 'max:160', Rule::unique('users', 'email')->ignore($currentUserId)],
            'login_password' => ['sometimes', 'string', 'min:6', 'max:200'],
            'login_name' => ['sometimes', 'string', 'max:160'],
        ];
    }
}
