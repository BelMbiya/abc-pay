<?php

namespace App\Http\Requests;

class UpdateSettingsRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // route protégée par le middleware 'admin'
    }

    public function rules(): array
    {
        return [
            'currency' => ['sometimes', 'in:USD,CDF'],
            'usd_cdf_rate' => ['sometimes', 'numeric', 'min:1', 'max:1000000'],
            'transfer_cap' => ['sometimes', 'numeric', 'min:1', 'max:100000000'],
        ];
    }
}
