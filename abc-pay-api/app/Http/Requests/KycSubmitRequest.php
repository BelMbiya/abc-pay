<?php

namespace App\Http\Requests;

/** Dépôt des pièces KYC par le payeur (recto obligatoire, selfie obligatoire, verso optionnel). */
class KycSubmitRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification payeur portée par le middleware jwt
    }

    public function rules(): array
    {
        $img = ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:6144']; // 6 Mo

        return [
            'front' => array_merge(['required'], $img),
            'selfie' => array_merge(['required'], $img),
            'back' => array_merge(['nullable'], $img),
        ];
    }
}
