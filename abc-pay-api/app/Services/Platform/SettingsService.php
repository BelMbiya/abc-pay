<?php

namespace App\Services\Platform;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Réglages plateforme (clé/valeur) : devise d'affichage + taux de change.
 * Le taux permet de convertir les montants (USD/CDF) vers une devise de base
 * pour agréger correctement des transactions de devises différentes.
 */
class SettingsService
{
    public const CURRENCIES = ['USD', 'CDF'];

    private const DEFAULT_RATE = 2800.0; // 1 USD ≈ 2 800 CDF (indicatif)

    private const DEFAULT_TRANSFER_CAP = 10000.0; // plafond par transfert, en USD

    /** Devise plateforme courante (défaut USD). */
    public function currency(): string
    {
        return Cache::remember('settings.currency', 300, function () {
            return Setting::query()->whereKey('currency')->value('value') ?: 'USD';
        });
    }

    public function setCurrency(string $currency): string
    {
        $currency = in_array($currency, self::CURRENCIES, true) ? $currency : 'USD';
        Setting::updateOrCreate(['key' => 'currency'], ['value' => $currency]);
        Cache::forget('settings.currency');

        return $currency;
    }

    /** Taux : nombre de CDF pour 1 USD. */
    public function usdCdfRate(): float
    {
        return Cache::remember('settings.usd_cdf_rate', 300, function () {
            $v = Setting::query()->whereKey('usd_cdf_rate')->value('value');

            return $v !== null && (float) $v > 0 ? (float) $v : self::DEFAULT_RATE;
        });
    }

    public function setUsdCdfRate(float $rate): float
    {
        $rate = $rate > 0 ? round($rate, 4) : self::DEFAULT_RATE;
        Setting::updateOrCreate(['key' => 'usd_cdf_rate'], ['value' => (string) $rate]);
        Cache::forget('settings.usd_cdf_rate');

        return $rate;
    }

    /** Convertit un montant d'une devise vers une autre (USD/CDF). */
    public function convert(float $amount, string $from, string $to): float
    {
        if ($from === $to) {
            return round($amount, 2);
        }
        $rate = $this->usdCdfRate();
        if ($from === 'USD' && $to === 'CDF') {
            return round($amount * $rate, 2);
        }
        if ($from === 'CDF' && $to === 'USD') {
            return round($amount / $rate, 2);
        }

        return round($amount, 2); // devise inconnue : pas de conversion
    }

    /** Convertit vers la devise plateforme courante. */
    public function toBase(float $amount, string $from): float
    {
        return $this->convert($amount, $from, $this->currency());
    }

    /** Plafond par transfert, exprimé en USD. */
    public function transferCap(): float
    {
        return Cache::remember('settings.transfer_cap', 300, function () {
            $v = Setting::query()->whereKey('transfer_cap')->value('value');

            return $v !== null && (float) $v > 0 ? (float) $v : self::DEFAULT_TRANSFER_CAP;
        });
    }

    public function setTransferCap(float $cap): float
    {
        $cap = $cap > 0 ? round($cap, 2) : self::DEFAULT_TRANSFER_CAP;
        Setting::updateOrCreate(['key' => 'transfer_cap'], ['value' => (string) $cap]);
        Cache::forget('settings.transfer_cap');

        return $cap;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return [
            'currency' => $this->currency(),
            'usd_cdf_rate' => $this->usdCdfRate(),
            'transfer_cap' => $this->transferCap(),
        ];
    }
}
