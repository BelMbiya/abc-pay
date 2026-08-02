<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateAdminProfileRequest extends SecureFormRequest
{
    // Route protégée par le middleware 'admin' (l'admin authentifié = $this->user()).
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->user()?->id;

        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:160', Rule::unique('admins', 'email')->ignore($id)],
            'password' => ['sometimes', 'string', 'min:6', 'max:200'],
        ];
    }
}
