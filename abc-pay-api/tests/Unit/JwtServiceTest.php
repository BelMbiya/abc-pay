<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\Identity\JwtService;
use Firebase\JWT\ExpiredException;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;
use Throwable;

class JwtServiceTest extends TestCase
{
    use WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function user(): User
    {
        $user = new User;
        $user->id = '11111111-1111-1111-1111-111111111111';
        $user->phone = '+243811112222';

        return $user;
    }

    public function test_emet_et_verifie_un_jwt(): void
    {
        $service = app(JwtService::class);
        $claims = $service->parse($service->issueAccess($this->user()));

        $this->assertSame('access', $claims['type']);
        $this->assertSame('+243811112222', $claims['phone']);
        $this->assertSame($this->user()->id, $claims['sub']);
    }

    public function test_jeton_expire_est_rejete(): void
    {
        config(['jwt.access_ttl' => -10]);
        $service = app(JwtService::class);
        $token = $service->issueAccess($this->user());

        $this->expectException(ExpiredException::class);
        $service->parse($token);
    }

    public function test_jeton_altere_est_rejete(): void
    {
        $service = app(JwtService::class);
        $token = $service->issueAccess($this->user());

        $this->expectException(Throwable::class);
        $service->parse($token.'tamper');
    }
}
