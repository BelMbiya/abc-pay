<?php

namespace App\Http\Requests;

class TuitionPaymentRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // paiement tuition par un tiers autorisé (cahier §12.3)
    }

    public function rules(): array
    {
        return [
            'establishment_id' => ['required', 'uuid', 'exists:establishments,id'],
            'student_name' => ['required', 'string', 'max:160'],
            'student_matricule' => ['required', 'string', 'max:60'], // clé de réconciliation
            'student_info' => ['nullable', 'string', 'max:200'],
            'payer_name' => ['nullable', 'string', 'max:160'],
            'payer_phone' => ['nullable', 'string', 'max:20'],
            'payer_relation' => ['nullable', 'string', 'in:Parent,Tuteur,Étudiant,Proche'],
            'fee_type' => ['required', 'string', 'max:80'],
            'channel' => ['required', 'string', 'in:mpesa,airtel,orange,africell,visa'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'reference' => ['nullable', 'string', 'max:120'],
        ];
    }
}
