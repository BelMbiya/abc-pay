<?php

namespace App\Http\Requests;

class StoreStaffMemberRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // protégé par le middleware `staff` + contrôle du rôle direction
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160'],
            'role' => ['required', 'string', 'in:direction,comptable,caissier,consultation'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ];
    }
}
