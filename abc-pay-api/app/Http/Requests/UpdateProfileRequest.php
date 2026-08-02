<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/**
 * Mise à jour du profil / KYC du payeur authentifié (route protégée JWT).
 * Allowlist stricte : seuls les champs d'identité sont modifiables.
 */
class UpdateProfileRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->user()?->id;

        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'nullable', 'email', 'max:160', Rule::unique('users', 'email')->ignore($id)],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender' => ['sometimes', 'nullable', Rule::in(['M', 'F', 'autre'])],
            'address' => ['sometimes', 'nullable', 'string', 'max:200'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'id_doc_type' => ['sometimes', 'nullable', Rule::in(['carte_electeur', 'passeport', 'permis'])],
            'id_doc_number' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
