<?php

namespace App\Http\Requests;

class StoreFeeTypeRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // TODO : protéger par l'auth staff (module Identity — phase établissement)
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'frequency' => ['required', 'string', 'in:Unique,Mensuel,Trimestriel,Semestriel,Par crédit'],
            'optional' => ['nullable', 'boolean'],
        ];
    }
}
