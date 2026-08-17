<?php

namespace App\Http\Requests;

class UpdateEstablishmentRequest extends SecureFormRequest
{
    // Route protégée par le middleware 'admin'.
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:180'],
            'type' => ['sometimes', 'string', 'in:École maternelle,École primaire,École secondaire,Institut supérieur,Université'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'commission_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'currency' => ['sometimes', 'in:USD,CDF'],
            'billing_mode' => ['sometimes', 'in:payment_only,fee_management'],
            'is_active' => ['sometimes', 'boolean'],
            // Réception des reversements (passerelle CinetPay).
            'payout_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'payout_method' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
