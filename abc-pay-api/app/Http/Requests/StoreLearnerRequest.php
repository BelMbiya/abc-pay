<?php

namespace App\Http\Requests;

use App\Models\Establishment;
use Illuminate\Validation\Rule;

class StoreLearnerRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // protégé par le middleware `staff`
    }

    public function rules(): array
    {
        /** @var Establishment|null $establishment */
        $establishment = $this->attributes->get('establishment');

        return [
            'last_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'first_name' => ['required', 'string', 'max:80'],
            'academic_group' => ['nullable', 'string', 'max:120'],
            // Matricule obligatoire et unique dans l'établissement (clé de réconciliation).
            'matricule' => [
                'required', 'string', 'max:60',
                Rule::unique('learners', 'matricule')->where('establishment_id', $establishment?->id),
            ],
            'parent_name' => ['nullable', 'string', 'max:160'],
            'parent_phone' => ['nullable', 'string', 'max:20'],
            'parent_relation' => ['nullable', 'string', 'in:parent,tuteur,proche'],
        ];
    }
}
