<?php

namespace App\Services\Identity;

use App\Services\Identity\Contracts\PhoneTokenVerifier;
use App\Services\Identity\Exceptions\InvalidPhoneTokenException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Vérifie un ID token Firebase (Phone Auth). Le SMS/OTP est géré par Firebase
 * côté client ; ici on ne fait que valider le jeton signé par Google
 * (signature RS256, émetteur + audience = projet) et extraire le numéro.
 */
class FirebasePhoneTokenVerifier implements PhoneTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

    public function __construct(private readonly string $projectId) {}

    public function verify(string $idToken): string
    {
        try {
            $decoded = (array) JWT::decode($idToken, $this->googleKeys());
        } catch (Throwable $e) {
            throw new InvalidPhoneTokenException('Jeton Firebase invalide.', 0, $e);
        }

        if (($decoded['aud'] ?? null) !== $this->projectId) {
            throw new InvalidPhoneTokenException('Audience du jeton invalide.');
        }
        if (($decoded['iss'] ?? null) !== 'https://securetoken.google.com/'.$this->projectId) {
            throw new InvalidPhoneTokenException('Émetteur du jeton invalide.');
        }

        $phone = $decoded['phone_number'] ?? null;
        if (! is_string($phone) || $phone === '') {
            throw new InvalidPhoneTokenException('Numéro de téléphone absent du jeton.');
        }

        return $phone;
    }

    /**
     * Clés publiques Google (rotées), mises en cache 1h.
     *
     * @return array<string, Key>
     */
    private function googleKeys(): array
    {
        $certs = Cache::remember('firebase_public_certs', 3600, function () {
            return json_decode((string) file_get_contents(self::CERTS_URL), true) ?: [];
        });

        $keys = [];
        foreach ($certs as $kid => $cert) {
            $keys[$kid] = new Key($cert, 'RS256');
        }

        return $keys;
    }
}
