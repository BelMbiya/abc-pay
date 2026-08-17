<?php

namespace App\Http\Requests;

/** Mise à jour des réglages propres à un établissement (direction). */
class UpdateEstablishmentSettingsRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // staff middleware
    }

    public function rules(): array
    {
        return [
            'accept_refunds' => ['sometimes', 'boolean'],
            'refund_window_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'notify_staff_on_payment' => ['sometimes', 'boolean'],
        ];
    }
}
