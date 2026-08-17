<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Services\Platform\SettingsService;
use Illuminate\Http\JsonResponse;

/**
 * FAQ publiée, exposée publiquement (landing + page /faq). Gérée en admin.
 */
class FaqController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    /** Entrées PUBLIÉES, dans l'ordre d'affichage (nb plafonné par réglage admin). */
    public function publicIndex(): JsonResponse
    {
        $faqs = Faq::where('is_published', true)
            ->orderBy('position')->orderBy('created_at')
            ->limit($this->settings->faqLimit())
            ->get(['id', 'category', 'question', 'answer']);

        return response()->json(['data' => $faqs]);
    }
}
