<?php

namespace App\Services\Identity;

use Symfony\Component\Process\Process;

/**
 * OCR SERVEUR de pièces d'identité, via le moteur Tesseract appelé en sous-processus
 * (aucune donnée n'est envoyée à un tiers ; l'image ne quitte pas le serveur).
 *
 * Choix sécurité : l'OCR tourne sur l'image RÉELLEMENT déposée, côté serveur — le client
 * ne peut donc pas forger le texte pour forcer une validation. Repli sûr : si le binaire
 * n'est pas présent, on renvoie null → le dossier part en revue manuelle (jamais d'échec).
 *
 * Prérequis prod : installer Tesseract + langue française, p. ex.
 *   Debian/Ubuntu : apt-get install -y tesseract-ocr tesseract-ocr-fra
 *   Windows       : winget install UB-Mannheim.TesseractOCR   (ou définir TESSERACT_PATH)
 */
class OcrService
{
    /** @var string|null|false false = pas encore résolu */
    private string|null|false $binary = false;

    /** @var string|null langues effectives (ex. « fra+eng » ou « eng »), résolues une fois */
    private ?string $languages = null;

    /** Au-delà, on n'OCRise pas (anti-DoS / decode-bomb) → revue manuelle. ~25 Mpx. */
    private const MAX_PIXELS = 25_000_000;

    /** Extrait le texte d'une image (chemin ABSOLU). Renvoie null si OCR indisponible/échec. */
    public function extractText(string $absolutePath): ?string
    {
        $bin = $this->binary();
        if ($bin === null || ! is_file($absolutePath)) {
            return null;
        }

        // Borne la charge (M2) : image trop grande → on saute l'OCR (revue manuelle) plutôt que de
        // bloquer un worker et exposer Tesseract/Leptonica à une image géante malveillante.
        $size = @getimagesize($absolutePath);
        if ($size !== false && ($size[0] * $size[1]) > self::MAX_PIXELS) {
            return null;
        }

        try {
            $process = new Process([$bin, $absolutePath, 'stdout', '-l', $this->languages($bin), '--psm', '3']);
            $process->setTimeout(25);
            $process->run();
            if (! $process->isSuccessful()) {
                return null;
            }
            $text = trim($process->getOutput());

            return $text !== '' ? $text : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Construit l'argument de langue à partir de CE QUI EST INSTALLÉ (évite l'échec « Failed
     * loading language 'fra' »). Préfère le français, retombe sur l'anglais, sinon défaut.
     */
    private function languages(string $bin): string
    {
        if ($this->languages !== null) {
            return $this->languages;
        }

        $available = [];
        try {
            $probe = new Process([$bin, '--list-langs']);
            $probe->setTimeout(8);
            $probe->run();
            if ($probe->isSuccessful()) {
                foreach (preg_split('/\R/', $probe->getOutput()) ?: [] as $line) {
                    $line = trim($line);
                    if ($line !== '' && ! str_contains($line, ' ')) {
                        $available[$line] = true;
                    }
                }
            }
        } catch (\Throwable) {
            // ignore : on retombera sur 'eng'
        }

        $wanted = array_values(array_filter(['fra', 'eng'], fn ($l) => isset($available[$l])));

        return $this->languages = ($wanted ? implode('+', $wanted) : 'eng');
    }

    public function available(): bool
    {
        return $this->binary() !== null;
    }

    /** Résout l'exécutable Tesseract (env → PATH → chemins Windows usuels), mis en cache. */
    private function binary(): ?string
    {
        if ($this->binary !== false) {
            return $this->binary;
        }

        $candidates = array_filter([
            env('TESSERACT_PATH'),
            'tesseract',
            'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
            'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
        ]);

        foreach ($candidates as $candidate) {
            try {
                $probe = new Process([$candidate, '--version']);
                $probe->setTimeout(8);
                $probe->run();
                if ($probe->isSuccessful()) {
                    return $this->binary = $candidate;
                }
            } catch (\Throwable) {
                // essaie le suivant
            }
        }

        return $this->binary = null;
    }
}
