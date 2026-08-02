<?php

namespace App\Http\Requests;

class PaymentQuoteRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // devis public (paiement tuition par un tiers autorisé, cf. cahier §12.3)
    }

    public function rules(): array
    {
        return [
            'establishment_id' => ['required', 'uuid', 'exists:establishments,id'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
        ];
    }
}
