<?php

namespace App\Http\Requests;

/** Dépôt d'un avis (payeur ou établissement authentifié). */
class ReviewStoreRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // l'authentification est portée par le middleware (jwt / staff)
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'message' => ['required', 'string', 'min:8', 'max:600'],
            'author_role' => ['nullable', 'string', 'max:60'],
            'context' => ['nullable', 'string', 'max:120'],
        ];
    }
}
