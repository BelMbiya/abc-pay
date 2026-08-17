<?php

namespace App\Http\Requests;

class FirebaseAuthRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification : public par nature
    }

    public function rules(): array
    {
        // À l'inscription (signup), l'identité minimale (nom) est OBLIGATOIRE : c'est ce
        // qui empêche la création d'un compte « fantôme » à la simple réception d'un code.
        $signup = $this->input('intent') === 'signup';

        return [
            'firebase_id_token' => ['required', 'string', 'max:4096'],
            // login = compte existant requis ; signup = inscription délibérée.
            'intent' => ['nullable', 'string', 'in:login,signup'],
            // Identité fournie à l'inscription (ignorée en login / si le compte existe déjà).
            'profile' => ['nullable', 'array'],
            'profile.name' => [$signup ? 'required' : 'nullable', 'string', 'min:2', 'max:120'],
            'profile.email' => ['nullable', 'email', 'max:180'],
            'profile.birth_date' => ['nullable', 'date'],
            'profile.gender' => ['nullable', 'string', 'max:20'],
            'profile.address' => ['nullable', 'string', 'max:200'],
            'profile.city' => ['nullable', 'string', 'max:120'],
            'profile.id_doc_type' => ['nullable', 'string', 'max:40'],
            'profile.id_doc_number' => ['nullable', 'string', 'max:60'],
        ];
    }
}
