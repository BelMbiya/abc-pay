<?php

namespace App\Http\Requests;

use App\Services\Tenancy\EstablishmentDocuments;
use Illuminate\Validation\Rule;

/** Dépôt d'une pièce KYB par l'établissement (staff) : numéro et/ou fichier. */
class UploadEstablishmentDocumentRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // portée par le middleware 'staff'
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(array_keys(EstablishmentDocuments::CATALOG))],
            'number' => ['nullable', 'string', 'max:120'],
            // Pièces courantes RDC : certificats/scans (PDF) ou photos. 8 Mo max.
            'file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:8192'],
        ];
    }
}
