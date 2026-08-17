<?php

namespace App\Http\Requests;

/** Demande de remboursement d'une transaction (super-admin). */
class RefundStoreRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification admin portée par le middleware
    }

    public function rules(): array
    {
        return [
            'transaction_id' => ['required', 'uuid', 'exists:transactions,id'],
            'reason' => ['required', 'string', 'max:300'],
        ];
    }
}
