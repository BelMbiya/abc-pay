<?php

namespace App\Http\Requests;

class OnboardEstablishmentRequest extends SecureFormRequest
{
    // Route protégée par le middleware 'admin' : l'autorisation est déjà faite en amont.
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:180'],
            'type' => ['required', 'string', 'in:École maternelle,École primaire,École secondaire,Institut supérieur,Université'],
            'city' => ['nullable', 'string', 'max:120'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'currency' => ['nullable', 'in:USD,CDF'],
            'billing_mode' => ['nullable', 'in:payment_only,fee_management'],
            // Compte de connexion de l'établissement (direction)
            'login_email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'login_password' => ['required', 'string', 'min:8', 'max:200'],
            'login_name' => ['nullable', 'string', 'max:160'],
            // Documents KYB (RDC) — numéros saisis à l'onboarding (pièces revues ensuite)
            'rccm_number' => ['nullable', 'string', 'max:120'],
            'id_nat_number' => ['nullable', 'string', 'max:120'],
            'nif_number' => ['nullable', 'string', 'max:120'],
            'ministry_approval_number' => ['nullable', 'string', 'max:120'],
        ];
    }
}
