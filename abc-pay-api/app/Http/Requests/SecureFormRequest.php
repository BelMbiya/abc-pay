<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Base de toutes les requêtes validées d'abc pay.
 *
 * Principe : ALLOWLIST stricte. Chaque endpoint DOIT déclarer ses règles
 * (type, format, bornes) ; tout champ non déclaré est ignoré via validated().
 * - authorize() renvoie false par défaut : chaque requête DOIT expliciter
 *   son autorisation (moindre privilège, anti-oubli).
 * - Réponses d'erreur toujours en JSON structuré.
 * Réf : docs/SECURITY.md §5 & §6.
 */
abstract class SecureFormRequest extends FormRequest
{
    /**
     * Refus par défaut : toute sous-classe doit surcharger explicitement.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Règles de validation (allowlist). À implémenter par chaque requête.
     *
     * @return array<string, mixed>
     */
    abstract public function rules(): array;

    /**
     * Erreur de validation → 422 JSON structuré.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'error' => [
                'code' => 'validation_failed',
                'message' => 'Les données fournies sont invalides.',
                'fields' => $validator->errors(),
            ],
        ], 422));
    }

    /**
     * Échec d'autorisation → 403 JSON structuré.
     */
    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'error' => [
                'code' => 'forbidden',
                'message' => 'Action non autorisée.',
            ],
        ], 403));
    }
}
