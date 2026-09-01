<?php

namespace App\Http\Requests;

class TransactionStoreRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // route protégée par le middleware jwt
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:send,service'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'currency' => ['nullable', 'in:USD,CDF'],
            'channel' => ['required', 'in:mpesa,airtel,orange,africell,visa'],
            'counterparty_name' => ['nullable', 'string', 'max:120'],
            'counterparty_phone' => ['nullable', 'string', 'max:30'],
            'payer_phone' => ['nullable', 'string', 'max:30'], // numéro Mobile Money du payeur (push direct)
            'label' => ['nullable', 'string', 'max:120'],
            'reference' => ['nullable', 'string', 'max:120'],
        ];
    }
}
