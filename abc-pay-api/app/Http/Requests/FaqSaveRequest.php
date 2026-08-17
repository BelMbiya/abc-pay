<?php

namespace App\Http\Requests;

/** Création / mise à jour d'une entrée de FAQ (super-admin). */
class FaqSaveRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // l'authentification admin est portée par le middleware
    }

    public function rules(): array
    {
        // À la création (POST) question/réponse sont requises ; en édition (PATCH),
        // on autorise une mise à jour partielle.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'question' => [$required, 'string', 'max:300'],
            'answer' => [$required, 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:60'],
            'position' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_published' => ['nullable', 'boolean'],
        ];
    }
}
