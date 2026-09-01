<?php

namespace App\Http\Requests;

/** Modification d'un type de frais (partielle ; protégé par le middleware `staff`). */
class UpdateFeeTypeRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:80'],
            'frequency' => ['sometimes', 'string', 'in:Unique,Mensuel,Trimestriel,Semestriel,Par crédit'],
            'optional' => ['sometimes', 'boolean'],
        ];
    }
}
