<?php

namespace App\Services\Payment\Gateways\Contracts;

/**
 * Statut NEUTRE d'un encaissement, indépendant de la passerelle. Chaque passerelle
 * traduit ses propres codes (CinetPay SUCCESS/FAILED/PENDING, Araka APPROVED/DECLINED/
 * PENDING) vers cet état commun.
 */
enum PaymentState: string
{
    case Success = 'success';
    case Failed = 'failed';
    case Pending = 'pending';
}
