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

    private const DEFAULT_REFUND_WINDOW_DAYS = 30; // délai bancaire de remboursement (jours)

    private const DEFAULT_SETTLEMENT_SLA_DAYS = 7; // délai cible de reversement à un établissement (jours)

    private const DEFAULT_FAQ_LIMIT = 8;      // nb max de questions affichées (landing + /faq)

    private const DEFAULT_REVIEWS_LIMIT = 6;  // nb max de témoignages affichés (landing)

    private const LIMIT_MIN = 1;

    private const LIMIT_MAX = 50;

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

    /** Délai (jours) pendant lequel un remboursement reste possible, à partir de l'encaissement. */
    public function refundWindowDays(): int
    {
        return Cache::remember('settings.refund_window_days', 300, function () {
            $v = Setting::query()->whereKey('refund_window_days')->value('value');

            return $v !== null && (int) $v > 0 ? (int) $v : self::DEFAULT_REFUND_WINDOW_DAYS;
        });
    }

    public function setRefundWindowDays(int $days): int
    {
        $days = $days > 0 ? min($days, 3650) : self::DEFAULT_REFUND_WINDOW_DAYS;
        Setting::updateOrCreate(['key' => 'refund_window_days'], ['value' => (string) $days]);
        Cache::forget('settings.refund_window_days');

        return $days;
    }

    /** Délai cible (jours) pour reverser un établissement, à partir de son plus ancien encaissement en attente. */
    public function settlementSlaDays(): int
    {
        return Cache::remember('settings.settlement_sla_days', 300, function () {
            $v = Setting::query()->whereKey('settlement_sla_days')->value('value');

            return $v !== null && (int) $v > 0 ? (int) $v : self::DEFAULT_SETTLEMENT_SLA_DAYS;
        });
    }

    public function setSettlementSlaDays(int $days): int
    {
        $days = $days > 0 ? min($days, 365) : self::DEFAULT_SETTLEMENT_SLA_DAYS;
        Setting::updateOrCreate(['key' => 'settlement_sla_days'], ['value' => (string) $days]);
        Cache::forget('settings.settlement_sla_days');

        return $days;
    }

    /** Nb max de questions FAQ publiées à afficher (landing + page /faq). */
    public function faqLimit(): int
    {
        return $this->intSetting('landing_faq_limit', self::DEFAULT_FAQ_LIMIT);
    }

    public function setFaqLimit(int $limit): int
    {
        return $this->setIntSetting('landing_faq_limit', $limit, self::DEFAULT_FAQ_LIMIT);
    }

    /** Nb max de témoignages approuvés à afficher (landing). */
    public function reviewsLimit(): int
    {
        return $this->intSetting('landing_reviews_limit', self::DEFAULT_REVIEWS_LIMIT);
    }

    public function setReviewsLimit(int $limit): int
    {
        return $this->setIntSetting('landing_reviews_limit', $limit, self::DEFAULT_REVIEWS_LIMIT);
    }

    /** Lecture d'un réglage entier borné (avec cache + repli défaut). */
    private function intSetting(string $key, int $default): int
    {
        return Cache::remember("settings.$key", 300, function () use ($key, $default) {
            $v = Setting::query()->whereKey($key)->value('value');

            return $v !== null && (int) $v > 0 ? (int) $v : $default;
        });
    }

    /** Écriture d'un réglage entier, borné [LIMIT_MIN, LIMIT_MAX]. */
    private function setIntSetting(string $key, int $value, int $default): int
    {
        $value = max(self::LIMIT_MIN, min(self::LIMIT_MAX, $value > 0 ? $value : $default));
        Setting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        Cache::forget("settings.$key");

        return $value;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return [
            'currency' => $this->currency(),
            'usd_cdf_rate' => $this->usdCdfRate(),
            'transfer_cap' => $this->transferCap(),
            'refund_window_days' => $this->refundWindowDays(),
            'landing_faq_limit' => $this->faqLimit(),
            'landing_reviews_limit' => $this->reviewsLimit(),
        ];
    }
}
