<?php

namespace App\Http\Requests;

class StoreFeeScheduleRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // protégé par le middleware `staff`
    }

    public function rules(): array
    {
        return [
            'fee_type_id' => ['required', 'uuid', 'exists:fee_types,id'],
            'academic_group' => ['nullable', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
        ];
    }
}
