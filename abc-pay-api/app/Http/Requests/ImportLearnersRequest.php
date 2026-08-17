<?php

namespace App\Http\Requests;

/**
 * Import / réconciliation en masse d'apprenants (back-office établissement).
 * Validation légère de l'enveloppe ; le service rapproche par matricule et
 * renvoie un bilan par ligne (créés / réconciliés / erreurs).
 */
class ImportLearnersRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // protégé par le middleware `staff`
    }

    public function rules(): array
    {
        return [
            'learners' => ['required', 'array', 'min:1', 'max:2000'],
            'learners.*.matricule' => ['nullable', 'string', 'max:60'],
            'learners.*.last_name' => ['nullable', 'string', 'max:80'],
            'learners.*.middle_name' => ['nullable', 'string', 'max:80'],
            'learners.*.first_name' => ['nullable', 'string', 'max:80'],
            'learners.*.academic_group' => ['nullable', 'string', 'max:120'],
            'learners.*.parent_name' => ['nullable', 'string', 'max:160'],
            'learners.*.parent_phone' => ['nullable', 'string', 'max:20'],
            'learners.*.parent_relation' => ['nullable', 'string', 'max:20'],
        ];
    }
}
