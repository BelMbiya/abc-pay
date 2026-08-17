<?php

namespace App\Http\Requests;

use App\Services\Identity\AdminRbac;
use Illuminate\Validation\Rule;

/** Mise à jour d'un compte administrateur (rôle / activation). */
class AdminUpdateRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::in(AdminRbac::roles())],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
