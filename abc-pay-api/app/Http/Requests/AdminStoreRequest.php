<?php

namespace App\Http\Requests;

use App\Services\Identity\AdminRbac;
use Illuminate\Validation\Rule;

/** Création d'un compte administrateur (réservée à `admins.manage`). */
class AdminStoreRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // gate `admin.can:admins.manage` sur la route
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:admins,email'],
            'role' => ['required', Rule::in(AdminRbac::roles())],
            'password' => ['required', 'string', 'min:8', 'max:100'],
        ];
    }
}
