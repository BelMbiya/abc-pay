<?php

namespace App\Http\Requests;

/** Modification d'une ligne de barème (protégé par le middleware `staff`). */
class UpdateFeeScheduleRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'academic_group' => ['nullable', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
        ];
    }
}
