<?php

namespace App\Http\Requests;

/**
 * Vérification d'un reçu — endpoint public (n'importe qui tenant le reçu peut vérifier).
 * Deux voies : `token` (lu depuis le QR) OU `number` + `code` (saisie manuelle).
 */
class ReceiptVerifyRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // vérification publique (rate-limitée au niveau de la route)
    }

    public function rules(): array
    {
        return [
            'token' => ['required_without:number', 'nullable', 'string', 'min:16', 'max:64'],
            'number' => ['required_without:token', 'nullable', 'string', 'max:32'],
            'code' => ['required_with:number', 'nullable', 'string', 'max:16'],
        ];
    }
}
