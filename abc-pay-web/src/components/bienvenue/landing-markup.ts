// AUTO-GENERATED from the ABC Pay landing design export. Do not edit by hand.
// Faithful port; light surfaces/text/borders tokenised to CSS vars for theming
// (brand blue + gold stay literal). Behaviour lives in landing-logic.ts.
export const LANDING_HTML = `<div id="page" style="background:var(--s-page);color:var(--t-ink);font-family:var(--font-inter),system-ui,sans-serif">

  <!-- ============ TOP UTILITY BAR ============ -->
  <div id="utility-bar" style="background:#001A63;color:#fff">
    <div id="topbar" style="max-width:1300px;margin:0 auto;padding:9px 22px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <span style="font-size:12.5px;color:rgba(255,255,255,.62);font-weight:500" data-en="Paying a tuition fee?">Vous payez une scolarité ?</span>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <a href="#tuition" style="font-size:12px;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:5px 12px" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)" data-en="Pay a tuition fee">Payer une scolarité</a>
        <a href="#tuition" style="font-size:12px;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:5px 12px" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)" data-en="Find a receipt">Retrouver un reçu</a>
        <a href="#espaces" style="font-size:12px;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:5px 12px" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)" data-en="Scan a QR code">Scanner un QR code</a>
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-left:auto">
        <span style="font-size:12.5px;color:rgba(255,255,255,.62)">+243 000 000 000</span>
        <div role="group" aria-label="Langue" style="display:flex;align-items:center;gap:2px">
          <button id="lang-fr" type="button" data-act="setFr" style="border:0;cursor:pointer;font-family:Inter,sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;background:#FCB326;color:#00279C">FR</button>
          <button id="lang-en" type="button" data-act="setEn" style="border:0;cursor:pointer;font-family:Inter,sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;background:transparent;color:rgba(255,255,255,.7)">EN</button><button id="abc-theme-toggle" type="button" data-act="toggleTheme" aria-label="Basculer le thème clair/sombre" style="border:0;cursor:pointer;font-size:13px;line-height:1;width:27px;height:23px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;margin-left:8px;display:inline-flex;align-items:center;justify-content:center">&#9790;</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ NAV ============ -->
  <header id="nav" style="position:sticky;top:0;z-index:90;background:var(--s-card);border-bottom:1px solid var(--ln);transition:box-shadow .3s ease">
    <div style="max-width:1300px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;gap:24px">
      <a href="#page" aria-label="ABC Pay — accueil" style="display:block;flex-shrink:0">
        <img src="/logo.png" alt="Logo ABC Pay" style="height:40px;width:auto;display:block;border-radius:8px">
      </a>
      <nav id="navlinks" style="display:flex;align-items:center;gap:24px;margin:0 auto;font-size:14.5px;font-weight:600">
        <a href="#atouts" data-en="Platform" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">Plateforme</a>
        <a href="#tuition" data-en="Tuition" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">Tuition</a>
        <a href="#metiers" data-en="Institutions" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">Établissements</a>
        <a href="#securite" data-en="Security" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">Sécurité</a>
        <a href="#apropos" data-en="About" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">À propos</a>
        <a href="#faq" data-en="FAQ" style="color:var(--t-ink)" style-hover="color:var(--t-brand)">FAQ</a>
      </nav>
      <div style="display:flex;align-items:center;gap:10px;margin-left:auto">
        <a id="navlogin" href="#espaces" data-en="Log in" style="font-size:14px;font-weight:600;color:var(--t-brand);border:1px solid var(--ln);border-radius:999px;padding:10px 17px" style-hover="border-color:var(--ln);color:var(--t-brand)">Se connecter</a><a id="nav-signup" href="/inscription" data-en="Create account" style="font-size:14px;font-weight:700;color:#00279C;background:#FCB326;border-radius:999px;padding:10px 17px;white-space:nowrap;text-decoration:none">Créer un compte</a>
        <a id="navcta" href="#partenariat" style="display:inline-flex;align-items:center;gap:7px;background:#00279C;color:#fff;font-weight:700;font-size:14px;padding:11px 18px;border-radius:999px;white-space:nowrap" style-hover="background:#0B3FD6;color:#fff"><span data-en="Institution access">Accès Établissement</span> <span aria-hidden="true">›</span></a>
        <button id="burger" type="button" aria-label="Menu" data-act="toggleMenu" style="display:none;border:1px solid var(--ln);background:var(--s-card);color:var(--t-brand);width:42px;height:42px;border-radius:12px;cursor:pointer;font-size:17px;line-height:1">☰</button>
      </div>
    </div>
    <div id="mobilemenu" style="display:none;padding:6px 22px 20px;background:var(--s-card);border-top:1px solid var(--ln)">
      <div style="display:grid">
        <a href="#atouts" data-en="Platform" style="color:var(--t-ink);padding:13px 2px;border-bottom:1px solid var(--ln);font-weight:600">Plateforme</a>
        <a href="#tuition" data-en="Tuition" style="color:var(--t-ink);padding:13px 2px;border-bottom:1px solid var(--ln);font-weight:600">Tuition</a>
        <a href="#metiers" data-en="Institutions" style="color:var(--t-ink);padding:13px 2px;border-bottom:1px solid var(--ln);font-weight:600">Établissements</a>
        <a href="#securite" data-en="Security" style="color:var(--t-ink);padding:13px 2px;border-bottom:1px solid var(--ln);font-weight:600">Sécurité</a>
        <a href="#apropos" data-en="About" style="color:var(--t-ink);padding:13px 2px;border-bottom:1px solid var(--ln);font-weight:600">À propos</a>
        <a href="#faq" data-en="FAQ" style="color:var(--t-ink);padding:13px 2px;font-weight:600">FAQ</a>
      </div>
    </div>
  </header>

  <!-- ============ HERO ============ -->
  <section id="hero" style="position:relative;overflow:hidden;background:var(--s-soft);padding:clamp(34px,4.5vw,58px) 22px clamp(44px,5vw,72px)">
    <div id="grid-hero" style="position:relative;z-index:2;max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr);gap:clamp(28px,4vw,56px);align-items:center">
      <div style="display:flex;gap:clamp(14px,2vw,26px)">
        <!-- step rail -->
        <div id="steprail" role="tablist" aria-label="Ce qu'ABC Pay change, en trois points" style="display:flex;flex-direction:column;align-items:center;padding-top:52px;flex-shrink:0">
          <button data-step="" type="button" role="tab" aria-label="1 — ABC Pay au quotidien" data-act="goStep1" style="width:32px;height:32px;border-radius:50%;background:#00279C;border:1px solid #00279C;color:#fff;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12px;transition:background .3s ease,color .3s ease,border-color .3s ease,transform .3s ease;padding:0">1</button>
          <span data-steprail="" style="width:2px;flex:1;min-height:44px;background:#C3CEEA;position:relative;overflow:hidden"><span data-steprailfill="" style="position:absolute;left:0;right:0;top:0;height:100%;background:#00279C;transform:scaleY(0);transform-origin:top;transition:transform .5s cubic-bezier(.16,1,.3,1)"></span></span>
          <button data-step="" type="button" role="tab" aria-label="2 — les opérations d'argent du quotidien" data-act="goStep2" style="width:32px;height:32px;border-radius:50%;background:var(--s-card);border:1px solid var(--ln);color:var(--t-faint);cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12px;transition:background .3s ease,color .3s ease,border-color .3s ease,transform .3s ease;padding:0">2</button>
          <span data-steprail="" style="width:2px;flex:1;min-height:44px;background:#C3CEEA;position:relative;overflow:hidden"><span data-steprailfill="" style="position:absolute;left:0;right:0;top:0;height:100%;background:#00279C;transform:scaleY(0);transform-origin:top;transition:transform .5s cubic-bezier(.16,1,.3,1)"></span></span>
          <button data-step="" type="button" role="tab" aria-label="3 — le programme Tuition" data-act="goStep3" style="width:32px;height:32px;border-radius:50%;background:var(--s-card);border:1px solid var(--ln);color:var(--t-faint);cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12px;transition:background .3s ease,color .3s ease,border-color .3s ease,transform .3s ease;padding:0">3</button>
        </div>

        <div>
          <div style="display:inline-flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:5px 14px 5px 6px;animation:fadeUp .6s both">
            <span style="background:#FCB326;color:#00279C;font-size:10.5px;font-weight:800;letter-spacing:.08em;padding:4px 8px;border-radius:999px" data-en="NEW">NOUVEAU</span>
            <span style="font-size:12.5px;font-weight:600;color:var(--t-brand)" data-en="The Connected Money · live in Kinshasa">The Connected Money · opérationnel à Kinshasa</span>
          </div>

          <h1 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(34px,4.9vw,62px);line-height:1.04;letter-spacing:-.035em;margin:20px 0 0;color:var(--t-ink);text-wrap:balance">
            <span data-en="Your money, connected every day."><span style="display:inline-block;animation:wUp .7s .08s both">Votre&nbsp;</span><span style="display:inline-block;animation:wUp .7s .16s both">argent,&nbsp;</span><span style="display:inline-block;animation:wUp .7s .26s both;color:var(--t-brand)">connecté&nbsp;</span><span style="display:inline-block;animation:wUp .7s .34s both;color:var(--t-brand)">au&nbsp;</span><span style="display:inline-block;animation:wUp .7s .42s both;color:var(--t-brand)">quotidien.</span></span>
            <span style="display:block;height:4px"></span>
            <span style="display:inline-block;animation:wUp .7s .52s both;font-size:.56em;font-weight:700;color:var(--t-faint);letter-spacing:-.02em" data-en="And school fees settled in 60 seconds.">Et la scolarité réglée en 60 secondes.</span>
          </h1>

          <div id="stepcap" style="display:flex;align-items:flex-start;gap:10px;margin-top:16px;max-width:52ch;animation:fadeUp .7s .52s both">
            <span aria-hidden="true" style="width:22px;height:2px;background:#FCB326;flex-shrink:0;margin-top:9px"></span>
            <span data-stepcap="" style="font-size:14px;font-weight:600;color:var(--t-brand)" data-en="1 — An everyday tool: opens in the browser, no install.">1 — Un outil du quotidien : dans le navigateur, sans installation.</span>
            <span data-stepcap="" style="display:none;font-size:14px;font-weight:600;color:var(--t-brand)" data-en="2 — Send, receive, pay, top up: the money moves of every day.">2 — Envoyer, recevoir, payer, recharger : l'argent de chaque jour.</span>
            <span data-stepcap="" style="display:none;font-size:14px;font-weight:600;color:var(--t-brand)" data-en="3 — Tuition: scan the institution's QR code and settle the fees.">3 — Tuition : scannez le QR de l'établissement et réglez la scolarité.</span>
          </div>

          <p style="font-size:clamp(15.5px,1.25vw,18px);line-height:1.66;color:var(--t-muted);margin:20px 0 0;max-width:52ch;animation:fadeUp .7s .56s both;text-wrap:pretty" data-en="Send, receive, pay a merchant, settle a fee: ABC Pay is the payment platform built for the DRC — Airtel Money, Orange Money, M-Pesa, Africell, card and transfer. And with Tuition, our flagship program, a family settles school fees in 60 seconds while the institution sees the franc land on the right student number.">Envoyer, recevoir, payer un marchand, régler des frais : ABC Pay est la plateforme de paiement pensée pour la RDC — Airtel Money, Orange Money, M-Pesa, Africell, carte et virement. Et avec Tuition, notre programme phare, une famille règle la scolarité en 60 secondes pendant que l'établissement voit le franc arriver sur le bon matricule.</p>

          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:28px;animation:fadeUp .7s .62s both">
            <a href="#partenariat" style="display:inline-flex;align-items:center;gap:9px;background:#00279C;color:#fff;font-weight:700;font-size:15.5px;padding:15px 25px;border-radius:999px" style-hover="background:#0B3FD6;color:#fff"><span data-en="Book a demo">Demander une démo</span> <span aria-hidden="true">›</span></a>
            <a href="#partenariat" style="display:inline-flex;align-items:center;gap:10px;background:var(--s-card);border:1px solid var(--ln);color:var(--t-ink);font-family:Inter,sans-serif;font-weight:600;font-size:15.5px;padding:15px 22px;border-radius:999px;cursor:pointer" style-hover="border-color:var(--ln);color:var(--t-brand)">
              <span aria-hidden="true" style="width:24px;height:24px;border-radius:50%;background:#FCB326;color:#00279C;display:inline-flex;align-items:center;justify-content:center;font-size:12px">✉</span>
              <span data-en="Contact us">Nous contacter</span>
            </a>
          </div>

          <div style="display:flex;align-items:center;gap:14px;margin-top:30px;animation:fadeUp .7s .68s both">
            <div style="display:flex">
              <span aria-hidden="true" style="width:38px;height:38px;border-radius:50%;background:#00279C;border:2px solid #F4F7FF;display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:11.5px;color:#fff">É</span>
              <span aria-hidden="true" style="width:38px;height:38px;border-radius:50%;background:#007CD7;border:2px solid #F4F7FF;margin-left:-11px;display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:11.5px;color:#fff">U</span>
              <span aria-hidden="true" style="width:38px;height:38px;border-radius:50%;background:#FCB326;border:2px solid #F4F7FF;margin-left:-11px;display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:700;font-size:11.5px;color:#00279C">P</span>
            </div>
            <span style="font-size:13.5px;color:var(--t-muted);line-height:1.5;max-width:34ch" data-en="Households, merchants, schools and universities — one platform, three workspaces.">Ménages, commerçants, écoles et universités — une plateforme, trois espaces.</span>
          </div>
        </div>
      </div>

      <!-- portraits pilotés par le stepper -->
      <div id="hero-stage" style="position:relative;animation:fadeUp .8s .3s both">
        <div style="position:relative;border-radius:28px;overflow:hidden;aspect-ratio:1/1;background:var(--s-soft)">
          <span aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;aspect-ratio:1;border-radius:50%;background:var(--s-card)"></span>
          <span aria-hidden="true" style="position:absolute;left:9%;bottom:0;width:82%;height:64%;border-radius:180px 180px 0 0;background:linear-gradient(180deg,rgba(252,179,38,.18),rgba(252,179,38,0))"></span>
          <img data-heroshot="" src="/images/bienvenue/img_711bbbbb.png" alt="Un entrepreneur utilise ABC Pay depuis son navigateur" width="471" height="626" style="position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;padding:5% 7% 0;object-fit:contain;object-position:bottom center;display:block;filter:drop-shadow(-17px 13px 0 #FCB326);opacity:1;transform:scale(1) translateY(0);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);z-index:2">
          <img data-heroshot="" src="/images/bienvenue/img_25175dfd.png" alt="Un gestionnaire suit ses encaissements ABC Pay sur son ordinateur" width="736" height="929" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;padding:5% 7% 0;object-fit:contain;object-position:bottom center;display:block;filter:drop-shadow(-17px 13px 0 #FCB326);opacity:0;transform:scale(1.05) translateY(12px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);z-index:1">
          <img data-heroshot="" src="/images/bienvenue/img_bc4f67d2.png" alt="Une diplômée dont la scolarité a été réglée avec Tuition" width="720" height="915" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;padding:5% 7% 0;object-fit:contain;object-position:bottom center;display:block;filter:drop-shadow(-17px 13px 0 #FCB326);opacity:0;transform:scale(1.05) translateY(12px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);z-index:1">
        </div>
      </div>
    </div>
  </section>

  <!-- ============ 01 · ATOUTS ============ -->
  <section id="atouts" style="background:var(--s-card);padding:clamp(58px,7vw,100px) 22px">
    <div id="grid-atouts" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,2.2fr);gap:clamp(28px,4vw,52px);align-items:start">
      <div data-reveal="">
        <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="Platform">Plateforme</span>
        <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,40px);line-height:1.12;letter-spacing:-.03em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="Everything it takes to move money without cash">Tout ce qu'il faut pour faire circuler l'argent sans espèces</h2>
        <p style="font-size:15.5px;line-height:1.66;color:var(--t-muted);margin:14px 0 0;max-width:38ch;text-wrap:pretty" data-en="Four building blocks, one platform — for a household as much as for an institution.">Quatre briques, une seule plateforme — pour un ménage comme pour une institution.</p>
        <a href="#tuition" style="display:inline-flex;align-items:center;gap:8px;margin-top:22px;border:1px solid var(--ln);border-radius:999px;padding:12px 20px;font-size:14.5px;font-weight:600;color:var(--t-brand)" style-hover="border-color:var(--ln);background:var(--s-soft);color:var(--t-brand)"><span data-en="Explore the platform">Explorer la plateforme</span> <span aria-hidden="true">›</span></a>
      </div>
      <div id="grid-atouts-cards" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
        <div data-reveal="" style="background:var(--s-soft);border-radius:20px;padding:22px;transition:transform .35s ease" style-hover="transform:translateY(-6px)">
          <span aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800">⌗</span>
          <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16.5px;margin:16px 0 0;color:var(--t-ink)" data-en="Send &amp; receive, every day">Envoyer &amp; recevoir, chaque jour</h3>
          <p style="font-size:13.5px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="Money to a relative, a merchant, a fee to settle: one flow, a receipt every time.">De l'argent à un proche, à un marchand, un frais à régler : un seul parcours, un reçu à chaque fois.</p>
        </div>
        <div data-reveal="" style="background:var(--s-gold-soft);border-radius:20px;padding:22px;transition:transform .35s ease" style-hover="transform:translateY(-6px)">
          <span aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-gold);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800">◎</span>
          <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16.5px;margin:16px 0 0;color:var(--t-ink)" data-en="Four wallets, one flow">Quatre portefeuilles, un parcours</h3>
          <p style="font-size:13.5px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="Airtel, Orange, M-Pesa, Africell — plus card and transfer, behind one layer.">Airtel, Orange, M-Pesa, Africell — plus carte et virement, derrière une seule couche.</p>
        </div>
        <div data-reveal="" style="background:var(--s-info-soft);border-radius:20px;padding:22px;transition:transform .35s ease" style-hover="transform:translateY(-6px)">
          <span aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:#007CD7;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800">◱</span>
          <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16.5px;margin:16px 0 0;color:var(--t-ink)" data-en="Collect &amp; reconcile">Encaisser &amp; réconcilier</h3>
          <p style="font-size:13.5px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="One journal, filters, CSV export and an Excel template keyed on student number.">Un journal, des filtres, un export CSV et un gabarit Excel réconcilié par matricule.</p>
        </div>
        <div data-reveal="" style="background:var(--s-ok-soft);border-radius:20px;padding:22px;transition:transform .35s ease" style-hover="transform:translateY(-6px)">
          <span aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-ok);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800">⛨</span>
          <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16.5px;margin:16px 0 0;color:var(--t-ink)" data-en="Auditable by design">Auditable par construction</h3>
          <p style="font-size:13.5px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="Server-side amounts, idempotent payments, signed webhooks, immutable trail.">Montants serveur, paiements idempotents, webhooks signés, piste d'audit immuable.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ 02 · PROBLÈME ============ -->
  <section id="probleme" style="background:var(--s-soft);padding:clamp(58px,7vw,100px) 22px">
    <div id="grid-probleme" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(30px,4.5vw,64px);align-items:center">
      <div id="media-probleme" data-reveal="" style="position:relative">
        <div aria-hidden="true" style="position:absolute;left:16px;top:16px;right:-16px;bottom:-16px;border:2px solid #FCB326;border-radius:24px"></div>
        <div style="position:relative;border-radius:24px;overflow:hidden;aspect-ratio:1/1;background:var(--s-soft);display:flex;align-items:flex-end;justify-content:center">
          <span aria-hidden="true" style="position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:82%;aspect-ratio:1;border-radius:50%;background:var(--s-card)"></span>
          <img src="/images/bienvenue/img_ab6bb4f7.png" alt="Un parent paie les frais scolaires de son enfant depuis son téléphone avec ABC Pay" width="735" height="547" style="position:relative;width:100%;height:auto;display:block">
        </div>
      </div>

      <div>
        <span data-reveal="" style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-card);border-radius:999px;padding:6px 12px" data-en="02 · The reality on the ground">02 · La réalité du terrain</span>
        <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.12;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance">
          <span data-en="Paying">Payer</span> <span style="position:relative;display:inline-block;font-style:italic"><span style="position:relative;z-index:1" data-en="in cash">en espèces</span><span aria-hidden="true" data-bar="" style="position:absolute;left:-2px;right:-2px;bottom:.05em;height:.34em;background:#FCB326;z-index:0;transform-origin:left center"></span></span> <span data-en="costs more than what you are paying for.">coûte plus cher que ce que l'on paie.</span>
        </h2>
        <p data-reveal="" style="font-size:16px;line-height:1.68;color:var(--t-muted);margin:16px 0 0;max-width:56ch;text-wrap:pretty" data-en="A trip across town to hand over an envelope, a receipt book, a counter that closes at 3pm, a treasurer rekeying deposit slips. &lt;b&gt;Every step leaks time, money and trust&lt;/b&gt; — whether it is a transfer to a relative or a term's school fees.">Une traversée de la ville pour remettre une enveloppe, un carnet de reçus, un guichet qui ferme à 15h, un comptable qui ressaisit des bordereaux. <b style="color:var(--t-ink)">Chaque étape fait fuir du temps, de l'argent et de la confiance</b> — qu'il s'agisse d'un envoi à un proche ou d'une tranche de scolarité.</p>
        <div style="display:grid;gap:10px;margin-top:24px;max-width:560px">
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;background:var(--s-card);border:1px solid var(--ln);border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:22px;height:22px;border-radius:7px;background:var(--s-gold-soft);color:var(--t-gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">!</span>
            <div><div style="font-weight:700;font-size:14.5px;color:var(--t-ink)" data-en="A handwritten receipt proves nothing">Un reçu manuscrit ne prouve rien</div><p style="font-size:13.5px;line-height:1.55;color:var(--t-muted);margin:4px 0 0" data-en="Disputes end up on the head teacher's desk, without evidence on either side.">Les litiges finissent sur le bureau de la direction, sans preuve d'aucun côté.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;background:var(--s-card);border:1px solid var(--ln);border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:22px;height:22px;border-radius:7px;background:var(--s-gold-soft);color:var(--t-gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">!</span>
            <div><div style="font-weight:700;font-size:14.5px;color:var(--t-ink)" data-en="Four operators, four statements">Quatre opérateurs, quatre relevés</div><p style="font-size:13.5px;line-height:1.55;color:var(--t-muted);margin:4px 0 0" data-en="One Excel file rebuilt every month, and a balance always a week late.">Un fichier Excel reconstruit chaque mois, et un solde toujours en retard d'une semaine.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;background:#00279C;border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:22px;height:22px;border-radius:7px;background:#FCB326;color:#00279C;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓</span>
            <div><div style="font-weight:700;font-size:14.5px;color:#fff" data-en="With ABC Pay">Avec ABC Pay</div><p style="font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.82);margin:4px 0 0" data-en="One payment point, a receipt for the payer, a posted balance for the institution — same second.">Un point de paiement, un reçu pour le payeur, un solde imputé pour l'institution — même seconde.</p></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ 03 · CANAUX ============ -->
  <section id="canaux" style="background:var(--s-card);padding:clamp(58px,7vw,100px) 22px">
    <div id="grid-canaux" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(30px,4.5vw,60px);align-items:center">
      <div id="diagramme" data-reveal="" style="display:grid;grid-template-columns:auto 54px minmax(0,1fr);gap:clamp(8px,1.4vw,18px);align-items:center;width:100%;max-width:580px;margin-left:auto;margin-right:auto">
        <div id="canaux-chips" style="display:grid;gap:8px">
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#E4002B" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#E4002B;flex-shrink:0;transition:background .35s ease"></span>Airtel Money
        </button>
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#FF7900" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#FF7900;flex-shrink:0;transition:background .35s ease"></span>Orange Money
        </button>
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#00A94F" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#00A94F;flex-shrink:0;transition:background .35s ease"></span>M-Pesa
        </button>
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#007CD7" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#007CD7;flex-shrink:0;transition:background .35s ease"></span>Africell
        </button>
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#00279C" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#00279C;flex-shrink:0;transition:background .35s ease"></span>Carte bancaire
        </button>
        <button data-chip="" type="button" style="display:flex;align-items:center;gap:9px;background:var(--s-card);border:1px solid var(--ln);border-radius:999px;padding:10px 15px;cursor:pointer;font-family:Sora,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--t-ink);text-align:left;white-space:nowrap;transition:background .35s ease,color .35s ease,border-color .35s ease">
          <span data-cdot="" data-color="#FCB326" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#FCB326;flex-shrink:0;transition:background .35s ease"></span>QR établissement
        </button>
        </div>

        <svg id="canaux-svg" viewBox="0 0 54 300" preserveAspectRatio="none" aria-hidden="true" style="width:54px;height:100%;min-height:270px;display:block;overflow:visible">
          <path d="M0 25 C34 25 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
          <path d="M0 75 C34 75 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
          <path d="M0 125 C34 125 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
          <path d="M0 175 C34 175 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
          <path d="M0 225 C34 225 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
          <path d="M0 275 C34 275 20 150 54 150" fill="none" stroke="#DDE4F5" stroke-width="1" style="transition:stroke .35s ease,stroke-width .35s ease"></path>
        </svg>

        <div style="background:var(--s-card);border:1px solid var(--ln);border-radius:22px;padding:clamp(16px,1.8vw,22px);box-shadow:0 30px 60px -40px rgba(11,26,68,.45)">
          <div style="display:flex;align-items:center;gap:11px">
            <img src="/logo.png" alt="ABC Pay" style="height:34px;width:auto;display:block;border-radius:6px">
            <div>
              <div style="font-family:Sora,sans-serif;font-weight:700;font-size:13.5px;color:var(--t-ink)" data-en="One collection point">Un seul point d'encaissement</div>
              <div style="font-size:11px;color:var(--t-faint)" data-en="every channel, one journal">tous les canaux, un journal</div>
            </div>
          </div>

          <div style="display:grid;gap:7px;margin-top:15px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--ln);border-radius:11px;padding:9px 11px">
              <span style="font-size:12px;color:var(--t-muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">ISC-24-0817 · Airtel</span>
              <span style="font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:var(--t-ok);white-space:nowrap">+250 $</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--ln);border-radius:11px;padding:9px 11px">
              <span style="font-size:12px;color:var(--t-muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">ISC-24-1043 · Orange</span>
              <span style="font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:var(--t-ok);white-space:nowrap">+120 $</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--ln);border-radius:11px;padding:9px 11px">
              <span style="font-size:12px;color:var(--t-muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">ISC-24-0902 · M-Pesa</span>
              <span style="font-family:Sora,sans-serif;font-weight:700;font-size:12px;color:var(--t-ok);white-space:nowrap">+80 $</span>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#00279C;border-radius:14px;padding:11px 13px;margin-top:13px">
            <span style="font-size:11.5px;font-weight:600;color:#fff" data-en="Settlement to the institution">Reversement à l'établissement</span>
            <span style="font-size:10.5px;font-weight:800;color:#00279C;background:#FCB326;border-radius:999px;padding:4px 9px;white-space:nowrap" data-en="D+1">J+1</span>
          </div>
        </div>
      </div>

      <div>
        <span data-reveal="" style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="03 · Omnichannel">03 · Omnicanal</span>
        <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.12;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance">
          <span data-en="One">Une</span> <span style="position:relative;display:inline-block;font-style:italic"><span style="position:relative;z-index:1" data-en="centralisation">centralisation</span><span aria-hidden="true" data-bar="" style="position:absolute;left:-2px;right:-2px;bottom:.05em;height:.34em;background:#FCB326;z-index:0;transform-origin:left center"></span></span> <span data-en="of every channel, in one journal.">de tous les canaux, dans un seul journal.</span>
        </h2>
        <p data-reveal="" style="font-size:16px;line-height:1.68;color:var(--t-muted);margin:16px 0 0;max-width:54ch;text-wrap:pretty" data-en="Forcing one operator means losing the payment. ABC Pay accepts &lt;b&gt;the four national wallets&lt;/b&gt;, card and transfer — and adding an operator never rewrites your flow.">Imposer un opérateur, c'est perdre le paiement. ABC Pay accepte <b style="color:var(--t-ink)">les quatre portefeuilles nationaux</b>, la carte et le virement — et ajouter un opérateur ne réécrit jamais votre parcours.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:24px">
          <div data-reveal="" style="border:1px solid var(--ln);border-radius:14px;padding:14px">
            <div style="font-family:Sora,sans-serif;font-weight:700;font-size:14px;color:var(--t-ink)">USD / CDF</div>
            <div style="font-size:12.5px;color:var(--t-muted);margin-top:4px" data-en="per institution">par établissement</div>
          </div>
          <div data-reveal="" style="border:1px solid var(--ln);border-radius:14px;padding:14px">
            <div style="font-family:Sora,sans-serif;font-weight:700;font-size:14px;color:var(--t-ink)" data-en="FX on aggregates">FX sur agrégats</div>
            <div style="font-size:12.5px;color:var(--t-muted);margin-top:4px" data-en="configurable rate">taux configurable</div>
          </div>
          <div data-reveal="" style="border:1px solid var(--ln);border-radius:14px;padding:14px">
            <div style="font-family:Sora,sans-serif;font-weight:700;font-size:14px;color:var(--t-ink)" data-en="One journal">Un journal</div>
            <div style="font-size:12.5px;color:var(--t-muted);margin-top:4px" data-en="CSV export">export CSV</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ 04 · TUITION ============ -->
  <section id="tuition" style="background:var(--s-soft);padding:clamp(58px,7vw,100px) 22px">
    <div style="max-width:1300px;margin:0 auto">
      <div id="grid-tuition-head" style="display:grid;grid-template-columns:minmax(0,1fr);gap:0;align-items:start;max-width:900px">
        <span data-reveal="" style="display:inline-block;justify-self:start;margin-bottom:14px;white-space:nowrap;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-card);border-radius:999px;padding:6px 12px" data-en="04 · An ABC Pay product">04 · Tuition, un produit ABC Pay</span>
        <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(28px,3.7vw,46px);line-height:1.1;letter-spacing:-.03em;margin:0;color:var(--t-ink);text-wrap:balance">
          Tuition — <span data-en="from the first tap to the">du premier clic au</span> <span style="position:relative;display:inline-block;font-style:italic"><span style="position:relative;z-index:1" data-en="reconciled balance">solde réconcilié</span><span aria-hidden="true" data-bar="" style="position:absolute;left:-2px;right:-2px;bottom:.05em;height:.34em;background:#FCB326;z-index:0;transform-origin:left center"></span></span>
        </h2>
        <p data-reveal="" style="font-size:16px;line-height:1.68;color:var(--t-muted);margin:16px 0 0;max-width:64ch;text-wrap:pretty" data-en="Tuition is the ABC Pay product for schools and universities: institution directory, student-number check, server-recalculated amounts, mobile money, branded receipt, posting to fee items, settlement to the institution.">Tuition est le produit ABC Pay dédié aux écoles et aux universités : annuaire des établissements, contrôle du matricule, montants recalculés côté serveur, mobile money, reçu de marque, imputation sur les postes de frais, reversement à l'établissement.</p>
      </div>

      <div id="grid-tuition" style="display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(28px,4vw,56px);align-items:start;margin-top:clamp(28px,3.4vw,44px)">
        <div id="media-tuition" style="position:relative;max-width:430px">
          <div aria-hidden="true" style="position:absolute;left:16px;top:16px;right:-16px;bottom:-16px;border:2px solid #FCB326;border-radius:24px"></div>
          <div style="position:relative;border-radius:24px;overflow:hidden;aspect-ratio:1/1;background:var(--s-card);border:1px solid var(--ln);display:flex;align-items:flex-end;justify-content:center">
            <span aria-hidden="true" style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:88%;height:62%;border-radius:200px 200px 0 0;background:var(--s-soft)"></span>
            <img src="/images/bienvenue/img_ac4ac5c0.png" alt="Une responsable administrative suit les paiements de scolarité dans le back-office ABC Pay" width="735" height="985" style="position:relative;width:auto;height:96%;display:block">
          </div>
          <img data-parallax="0.08" src="/images/bienvenue/img_bc83cc2a.png" alt="Écran d'accueil de l'application ABC Pay : solde, envoyer, recevoir, payer, collecter" width="407" height="858" loading="lazy" style="position:absolute;right:-14px;bottom:-30px;width:clamp(146px,14.5vw,190px);height:auto;display:block;border-radius:30px;box-shadow:0 38px 76px -40px rgba(11,26,68,.72);animation:bob 8s ease-in-out infinite">
        </div>

        <div style="display:grid;gap:11px">
          <div data-reveal="" style="display:flex;gap:14px;align-items:flex-start;background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px" style-hover="border-color:var(--ln)">
            <span aria-hidden="true" style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#00279C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓</span>
            <div><h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16px;margin:0;color:var(--t-ink)" data-en="Pick the institution, scan or search">Choisir l'établissement, scanner ou chercher</h3><p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:5px 0 0" data-en="The QR code opens the flow pre-filled — a poster becomes a payment point.">Le QR code ouvre le parcours prérempli — une affiche devient un point de paiement.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:14px;align-items:flex-start;background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px" style-hover="border-color:var(--ln)">
            <span aria-hidden="true" style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#00279C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓</span>
            <div><h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16px;margin:0;color:var(--t-ink)" data-en="Identify the learner by student number">Identifier l'apprenant par matricule</h3><p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:5px 0 0" data-en="School fields (class, option) or higher-education fields (faculty, promotion).">Champs école (classe, option) ou supérieur (faculté, promotion).</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:14px;align-items:flex-start;background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px" style-hover="border-color:var(--ln)">
            <span aria-hidden="true" style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#00279C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓</span>
            <div><h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16px;margin:0;color:var(--t-ink)" data-en="Pay from any wallet">Payer depuis n'importe quel portefeuille</h3><p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:5px 0 0" data-en="Amount recalculated server-side, idempotent request: a double tap never charges twice.">Montant recalculé côté serveur, requête idempotente : un double clic ne débite jamais deux fois.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:14px;align-items:flex-start;background:#00279C;border-radius:16px;padding:18px">
            <span aria-hidden="true" style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#FCB326;color:#00279C;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓</span>
            <div><h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:16px;margin:0;color:#fff" data-en="Receipt for the parent, posted balance for you">Reçu pour le parent, solde imputé pour vous</h3><p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,.82);margin:5px 0 0" data-en="Branded PDF, oldest fee item settled first, institution notified in the same second.">PDF de marque, poste de frais le plus ancien soldé d'abord, établissement notifié dans la même seconde.</p></div>
          </div>
          <a data-reveal="" href="#partenariat" style="display:inline-flex;align-items:center;gap:8px;background:#FCB326;color:#00279C;font-weight:700;font-size:15px;padding:14px 22px;border-radius:999px;justify-self:start;margin-top:6px" style-hover="background:#ffc44f;color:#00279C"><span data-en="Set up Tuition for my institution">Mettre Tuition en place chez moi</span> <span aria-hidden="true">›</span></a>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ CAPACITÉS (bandeau carte) ============ -->
  <section style="background:var(--s-card);padding:clamp(34px,4vw,58px) 22px">
    <div id="grid-capacites" data-reveal="" style="max-width:1300px;margin:0 auto;border:1px solid var(--ln);border-radius:24px;padding:clamp(20px,2.6vw,32px);display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2vw,28px)">
      <div style="display:flex;align-items:center;gap:13px">
        <span aria-hidden="true" style="flex-shrink:0;width:42px;height:42px;border-radius:13px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">4</span>
        <div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15.5px;color:var(--t-ink)" data-en="Operators">Opérateurs</div><div style="font-size:12.5px;color:var(--t-muted)" data-en="mobile money, one flow">mobile money, un parcours</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:13px">
        <span aria-hidden="true" style="flex-shrink:0;width:42px;height:42px;border-radius:13px;background:var(--s-gold-soft);color:var(--t-gold);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">⚡</span>
        <div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15.5px;color:var(--t-ink)" data-en="Instant receipt">Reçu instantané</div><div style="font-size:12.5px;color:var(--t-muted)" data-en="branded PDF, per learner">PDF de marque, par apprenant</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:13px">
        <span aria-hidden="true" style="flex-shrink:0;width:42px;height:42px;border-radius:13px;background:var(--s-ok-soft);color:var(--t-ok);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">0 $</span>
        <div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15.5px;color:var(--t-ink)" data-en="For the parent">Pour le parent</div><div style="font-size:12.5px;color:var(--t-muted)" data-en="no fee, ever">aucun frais, jamais</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:13px">
        <span aria-hidden="true" style="flex-shrink:0;width:42px;height:42px;border-radius:13px;background:var(--s-info-soft);color:#007CD7;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">◷</span>
        <div><div style="font-family:Sora,sans-serif;font-weight:800;font-size:15.5px;color:var(--t-ink)" data-en="Open 24/7">Ouvert 24/7</div><div style="font-size:12.5px;color:var(--t-muted)" data-en="no queue, no office hours">sans file, sans horaires</div></div>
      </div>
    </div>
  </section>

  <!-- ============ 05 · MÉTIERS ============ -->
  <section id="metiers" style="background:var(--s-card);padding:clamp(48px,6vw,86px) 22px">
    <div style="max-width:1300px;margin:0 auto">
      <div data-reveal="" style="display:flex;align-items:flex-end;justify-content:space-between;gap:22px;flex-wrap:wrap">
        <div style="max-width:640px">
          <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="05 · Institutions">05 · Établissements</span>
          <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.12;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="A primary school does not collect like a university.">Une école primaire n'encaisse pas comme une université.</h2>
          <p style="font-size:15.5px;line-height:1.66;color:var(--t-muted);margin:12px 0 0;max-width:56ch;text-wrap:pretty" data-en="Fee schedule, instalments, learner fields and reports follow your reality — not a generic template.">Barème, tranches, champs d'apprenant et rapports suivent votre réalité — pas un gabarit générique.</p>
        </div>
        <div style="display:flex;gap:9px">
          <button type="button" aria-label="Précédent" data-act="prevSector" style="width:46px;height:46px;border-radius:50%;border:1px solid var(--ln);background:var(--s-card);color:var(--t-brand);cursor:pointer;font-size:15px;font-family:Inter,sans-serif" style-hover="background:var(--s-soft);border-color:var(--ln)">‹</button>
          <button type="button" aria-label="Suivant" data-act="nextSector" style="width:46px;height:46px;border-radius:50%;border:1px solid #00279C;background:#00279C;color:#fff;cursor:pointer;font-size:15px;font-family:Inter,sans-serif" style-hover="background:#0B3FD6;border-color:var(--ln);color:#fff">›</button>
        </div>
      </div>

      <div id="sectortrack" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:clamp(26px,3.4vw,40px)">
        <article data-sector="" style="border:1px solid var(--ln);border-radius:22px;overflow:hidden;display:flex;flex-direction:column">
          <div style="position:relative;height:clamp(148px,16.5vw,196px);flex-shrink:0;background:var(--s-soft)">
            <img src="/images/bienvenue/img_cd80b6e4.jpg" alt="Élèves en uniforme dans la salle informatique d'une école secondaire" width="735" height="490" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            <span style="position:absolute;left:12px;top:12px;background:var(--s-card);color:var(--t-brand);font-size:11.5px;font-weight:700;border-radius:999px;padding:6px 11px;pointer-events:none" data-en="Schools">Écoles</span>
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;flex:1">
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;margin:0;color:var(--t-ink)" data-en="Primary &amp; secondary">Primaire &amp; secondaire</h3>
            <p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="Monthly instalments, class and option fields, arrears per class, a QR code on the notice board.">Tranches mensuelles, champs classe et option, impayés par classe, un QR code au valve.</p>
            <a href="#partenariat" style="margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;color:var(--t-brand)" style-hover="color:var(--t-link)"><span data-en="Set up my school">Configurer mon école</span> <span aria-hidden="true">›</span></a>
          </div>
        </article>
        <article data-sector="" style="border:1px solid var(--ln);border-radius:22px;overflow:hidden;display:flex;flex-direction:column">
          <div style="position:relative;height:clamp(148px,16.5vw,196px);flex-shrink:0;background:var(--s-soft)">
            <img src="/images/bienvenue/img_ede26887.jpg" alt="Entrée d'une université officielle en République Démocratique du Congo" width="736" height="491" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            <span style="position:absolute;left:12px;top:12px;background:var(--s-card);color:var(--t-brand);font-size:11.5px;font-weight:700;border-radius:999px;padding:6px 11px;pointer-events:none" data-en="Higher education">Supérieur</span>
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;flex:1">
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;margin:0;color:var(--t-ink)" data-en="Universities &amp; institutes">Universités &amp; instituts</h3>
            <p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="Faculty and promotion fields; enrolment, tuition and exam fees as separate items; recovery per promotion.">Champs faculté et promotion ; inscription, minerval et frais d'examen en postes distincts ; recouvrement par promotion.</p>
            <a href="#partenariat" style="margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;color:var(--t-brand)" style-hover="color:var(--t-link)"><span data-en="Set up my institute">Configurer mon institut</span> <span aria-hidden="true">›</span></a>
          </div>
        </article>
        <article data-sector="" style="border:1px solid var(--ln);border-radius:22px;overflow:hidden;display:flex;flex-direction:column">
          <div style="position:relative;height:clamp(148px,16.5vw,196px);flex-shrink:0;background:var(--s-soft)">
            <img src="/images/bienvenue/img_34c276e0.jpg" alt="Vue aérienne d'un établissement scolaire et de sa cour de rassemblement" width="735" height="490" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            <span style="position:absolute;left:12px;top:12px;background:var(--s-card);color:var(--t-brand);font-size:11.5px;font-weight:700;border-radius:999px;padding:6px 11px;pointer-events:none" data-en="Networks">Réseaux</span>
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;flex:1">
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;margin:0;color:var(--t-ink)" data-en="Networks &amp; school groups">Réseaux &amp; groupes scolaires</h3>
            <p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="One account per site, consolidated reporting, roles per member, settlements per establishment.">Un compte par site, reporting consolidé, rôles par membre, reversements par établissement.</p>
            <a href="#partenariat" style="margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;color:var(--t-brand)" style-hover="color:var(--t-link)"><span data-en="Consolidate my network">Consolider mon réseau</span> <span aria-hidden="true">›</span></a>
          </div>
        </article>
        <article data-sector="" style="display:none;border:1px solid var(--ln);border-radius:22px;overflow:hidden;flex-direction:column">
          <div style="position:relative;height:clamp(148px,16.5vw,196px);flex-shrink:0;background:var(--s-soft)">
            <img src="/images/bienvenue/img_69c9ad68.jpg" alt="Étudiant sur le campus de son établissement" width="736" height="1097" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            <span style="position:absolute;left:12px;top:12px;background:var(--s-card);color:var(--t-brand);font-size:11.5px;font-weight:700;border-radius:999px;padding:6px 11px;pointer-events:none" data-en="Partners">Partenaires</span>
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;flex:1">
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;margin:0;color:var(--t-ink)" data-en="Operators &amp; sponsors">Opérateurs &amp; sponsors</h3>
            <p style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:8px 0 0" data-en="A recurring, seasonal and traceable volume; NGOs and sponsors paying for whole cohorts, with a receipt per learner.">Un volume récurrent, saisonnier et traçable ; ONG et sponsors qui règlent des cohortes entières, avec un reçu par apprenant.</p>
            <a href="#partenariat" style="margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;color:var(--t-brand)" style-hover="color:var(--t-link)"><span data-en="Open a partnership">Ouvrir un partenariat</span> <span aria-hidden="true">›</span></a>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- ============ 06 · À PROPOS (wordmark fantôme + mosaïque) ============ -->
  <section id="apropos" style="position:relative;background:var(--s-soft);padding:clamp(58px,7vw,100px) 22px;overflow:hidden">
    <div aria-hidden="true" data-parallax="0.05" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:Sora,sans-serif;font-weight:800;font-size:clamp(110px,20vw,300px);letter-spacing:-.06em;color:rgba(11,26,68,.07);white-space:nowrap;line-height:1;user-select:none">abc pay</div>
    <div style="position:relative;max-width:1180px;margin:0 auto">
      <div id="grid-apropos" style="display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(18px,2.4vw,28px);align-items:start">
        <span data-reveal="" style="display:inline-block;justify-self:start;white-space:nowrap;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-card);border-radius:999px;padding:6px 12px" data-en="06 · About us">06 · À propos</span>
        <div>
          <div id="mosaic" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start">
            <div data-reveal="" style="border-radius:18px;overflow:hidden;aspect-ratio:3/4;background:var(--s-soft);margin-top:0">
              <img src="/images/bienvenue/img_63d202d8.jpg" alt="Jeune diplômée présentant son diplôme" width="700" height="1050" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
            <div data-reveal="" style="border-radius:18px;overflow:hidden;aspect-ratio:3/4;background:var(--s-soft);margin-top:clamp(14px,2.2vw,28px)">
              <img src="/images/bienvenue/img_f1d73d6b.jpg" alt="Étudiant dans le hall de son institut" width="600" height="900" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
            <div data-reveal="" style="border-radius:18px;overflow:hidden;aspect-ratio:3/4;background:var(--s-soft);margin-top:0">
              <img src="/images/bienvenue/img_a49d0fe5.jpg" alt="Élève diplômée tenant ses cahiers" width="626" height="626" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
            <div data-reveal="" style="border-radius:18px;overflow:hidden;aspect-ratio:3/4;background:var(--s-soft);margin-top:clamp(14px,2.2vw,28px)">
              <img src="/images/bienvenue/img_d70b5d83.jpg" alt="Étudiant avec son ordinateur portable et son sac à dos" width="640" height="985" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
          </div>
          <div data-reveal="" style="margin-top:clamp(24px,3vw,40px);max-width:60ch">
            <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(24px,3vw,38px);line-height:1.16;letter-spacing:-.028em;margin:0;color:var(--t-ink);text-wrap:balance" data-en="We build the payment rail the DRC deserves.">Nous construisons le rail de paiement que mérite la RDC.</h2>
            <p style="font-size:15.5px;line-height:1.68;color:var(--t-muted);margin:14px 0 0;text-wrap:pretty" data-en="ABC Pay — The Connected Money — connects everyday money: send, receive, pay, collect. We started where the need is sharpest, school and academic fees, with a single promise that holds for every payment: traceable for the institution, effortless for the family.">ABC Pay — The Connected Money — connecte l'argent du quotidien : envoyer, recevoir, payer, encaisser. Nous avons commencé là où le besoin est le plus vif, les frais scolaires et académiques, avec une promesse qui vaut pour chaque paiement : traçable pour l'institution, sans effort pour la famille.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ 07 · ESPACES ============ -->
  <section id="espaces" style="background:var(--s-card);padding:clamp(58px,7vw,100px) 22px">
    <div style="max-width:1300px;margin:0 auto">
      <div data-reveal="" style="text-align:center;max-width:660px;margin:0 auto">
        <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="07 · How it works">07 · Comment ça marche</span>
        <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.12;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="One platform, three workspaces, one truth.">Une plateforme, trois espaces, une seule vérité.</h2>
        <p style="font-size:15.5px;line-height:1.66;color:var(--t-muted);margin:12px 0 0;text-wrap:pretty" data-en="The payer, the institution and ABC Pay supervision see the same transaction — each with their own permissions.">Le payeur, l'établissement et la supervision ABC Pay voient la même transaction — chacun avec ses propres droits.</p>
      </div>
      <div id="grid-espaces" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:clamp(30px,4vw,50px);align-items:stretch;border-radius:0;overflow:hidden">
        <div data-espace="" role="button" tabindex="0" aria-pressed="false" data-act="pickEsp0" style="background:var(--s-soft);padding:clamp(24px,3vw,36px);cursor:pointer;transition:background .4s ease,box-shadow .4s ease,transform .4s ease">
          <span data-esp-icon="" aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;transition:background .4s ease,color .4s ease">◐</span>
          <div data-esp-label="" style="font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);margin-top:18px;transition:color .4s ease" data-en="Payer">Payeur</div>
          <h3 data-esp-title="" style="font-family:Sora,sans-serif;font-weight:700;font-size:19px;margin:7px 0 0;color:var(--t-ink);transition:color .4s ease" data-en="Parent, student, sponsor">Parent, étudiant, sponsor</h3>
          <p data-esp-text="" style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:9px 0 0;transition:color .4s ease" data-en="Pay, send, receive, scan a QR code, find every receipt again. No install, entry-level phones welcome.">Payer, envoyer, recevoir, scanner un QR code, retrouver chaque reçu. Sans installation, téléphones d'entrée de gamme bienvenus.</p>
          <a data-esp-cta="" href="#partenariat" style="display:none;align-items:center;gap:8px;margin-top:20px;background:#FCB326;color:#00279C;font-weight:700;font-size:14px;padding:11px 18px;border-radius:999px" style-hover="background:#ffc44f;color:#00279C"><span data-en="See the payer flow">Voir le parcours payeur</span> <span aria-hidden="true">›</span></a>
        </div>
        <div data-espace="" role="button" tabindex="0" aria-pressed="false" data-act="pickEsp1" style="background:var(--s-soft);padding:clamp(24px,3vw,36px);cursor:pointer;transition:background .4s ease,box-shadow .4s ease,transform .4s ease">
          <span data-esp-icon="" aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;transition:background .4s ease,color .4s ease">◼</span>
          <div data-esp-label="" style="font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);margin-top:18px;transition:color .4s ease" data-en="Institution back office">Back-office établissement</div>
          <h3 data-esp-title="" style="font-family:Sora,sans-serif;font-weight:700;font-size:19px;margin:7px 0 0;color:var(--t-ink);transition:color .4s ease" data-en="Management, accounting, cashier">Direction, comptabilité, caisse</h3>
          <p data-esp-text="" style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:9px 0 0;transition:color .4s ease" data-en="Dashboard, learners, fee schedule, arrears and reminders, settlements, CSV reports, roles per member.">Tableau de bord, apprenants, barème de frais, impayés et relances, reversements, rapports CSV, rôles par membre.</p>
          <a data-esp-cta="" href="#partenariat" style="display:none;align-items:center;gap:8px;margin-top:20px;background:#FCB326;color:#00279C;font-weight:700;font-size:14px;padding:11px 18px;border-radius:999px" style-hover="background:#ffc44f;color:#00279C"><span data-en="See a demo">Voir une démo</span> <span aria-hidden="true">›</span></a>
        </div>
        <div data-espace="" role="button" tabindex="0" aria-pressed="false" data-act="pickEsp2" style="background:var(--s-soft);padding:clamp(24px,3vw,36px);cursor:pointer;transition:background .4s ease,box-shadow .4s ease,transform .4s ease">
          <span data-esp-icon="" aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--s-card);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;transition:background .4s ease,color .4s ease">◑</span>
          <div data-esp-label="" style="font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);margin-top:18px;transition:color .4s ease" data-en="ABC Pay supervision">Supervision ABC Pay</div>
          <h3 data-esp-title="" style="font-family:Sora,sans-serif;font-weight:700;font-size:19px;margin:7px 0 0;color:var(--t-ink);transition:color .4s ease" data-en="Onboarding, risk, operators">Onboarding, risque, opérateurs</h3>
          <p data-esp-text="" style="font-size:14px;line-height:1.6;color:var(--t-muted);margin:9px 0 0;transition:color .4s ease" data-en="Institution provisioning, commissions, operator health, disputes, fraud alerts, currency and FX.">Provisionnement des établissements, commissions, santé des opérateurs, litiges, alertes de fraude, devise et change.</p>
          <a data-esp-cta="" href="#partenariat" style="display:none;align-items:center;gap:8px;margin-top:20px;background:#FCB326;color:#00279C;font-weight:700;font-size:14px;padding:11px 18px;border-radius:999px" style-hover="background:#ffc44f;color:#00279C"><span data-en="Talk to our team">Parler à notre équipe</span> <span aria-hidden="true">›</span></a>
        </div>
      </div>
      <p style="text-align:center;font-size:12.5px;color:var(--t-faint);margin:18px 0 0" data-en="Click a workspace to explore it.">Cliquez sur un espace pour l'explorer.</p>
    </div>
  </section>

  <!-- ============ 08 · SÉCURITÉ ============ -->
  <section id="securite" style="background:#00279C;padding:clamp(58px,7vw,100px) 22px;color:#fff">
    <div id="grid-securite" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(30px,4.5vw,60px);align-items:center">
      <div>
        <span data-reveal="" style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#FCB326;border:1px solid rgba(252,179,38,.45);border-radius:999px;padding:6px 12px" data-en="08 · Fintech-grade security">08 · Sécurité de niveau fintech</span>
        <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.12;letter-spacing:-.028em;margin:16px 0 0;text-wrap:balance" data-en="Built to be audited, not just to work.">Conçu pour être audité, pas seulement pour fonctionner.</h2>
        <p data-reveal="" style="font-size:16px;line-height:1.68;color:rgba(255,255,255,.8);margin:14px 0 0;max-width:50ch;text-wrap:pretty" data-en="Defence in depth from the first line of code: nothing about money is trusted to the browser.">Défense en profondeur dès la première ligne de code : rien de ce qui touche à l'argent n'est confié au navigateur.</p>
        <div style="display:grid;gap:11px;margin-top:24px;max-width:520px">
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:23px;height:23px;border-radius:7px;background:#FCB326;color:#00279C;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span>
            <div><div style="font-weight:700;font-size:15px" data-en="Server-side amounts">Montants côté serveur</div><p style="font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.72);margin:4px 0 0" data-en="Every amount, fee and commission is recalculated by the API. The client can only propose.">Chaque montant, frais et commission est recalculé par l'API. Le client ne peut que proposer.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:23px;height:23px;border-radius:7px;background:#FCB326;color:#00279C;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span>
            <div><div style="font-weight:700;font-size:15px" data-en="Idempotent payments">Paiements idempotents</div><p style="font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.72);margin:4px 0 0" data-en="One key, one transaction. Flaky 3G no longer creates duplicates.">Une clé, une transaction. Une 3G capricieuse ne crée plus de doublon.</p></div>
          </div>
          <div data-reveal="" style="display:flex;gap:13px;align-items:flex-start;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:15px 16px">
            <span aria-hidden="true" style="flex-shrink:0;width:23px;height:23px;border-radius:7px;background:#FCB326;color:#00279C;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span>
            <div><div style="font-weight:700;font-size:15px" data-en="Signed operator webhooks">Webhooks opérateurs signés</div><p style="font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.72);margin:4px 0 0" data-en="Confirmations are verified, replay-protected and written to an immutable audit trail.">Les confirmations sont vérifiées, protégées contre le rejeu et écrites dans un audit immuable.</p></div>
          </div>
        </div>
      </div>
      <div data-reveal="" style="background:var(--s-card);border-radius:24px;padding:clamp(24px,3vw,38px);color:var(--t-ink)">
        <div style="display:flex;align-items:center;gap:12px">
          <span aria-hidden="true" style="width:44px;height:44px;border-radius:13px;background:#00279C;color:#FCB326;display:flex;align-items:center;justify-content:center;font-size:19px">⛨</span>
          <h3 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(19px,2.1vw,25px);margin:0;letter-spacing:-.02em" data-en="Access &amp; compliance">Accès &amp; conformité</h3>
        </div>
        <div style="display:grid;gap:11px;margin-top:20px">
          <div style="display:flex;gap:11px;align-items:center;border-bottom:1px solid var(--ln);padding-bottom:11px"><span aria-hidden="true" style="width:20px;height:20px;border-radius:6px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span><span style="font-size:14.5px" data-en="Scoped tokens: payer, staff, admin">Jetons scopés : payeur, personnel, admin</span></div>
          <div style="display:flex;gap:11px;align-items:center;border-bottom:1px solid var(--ln);padding-bottom:11px"><span aria-hidden="true" style="width:20px;height:20px;border-radius:6px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span><span style="font-size:14.5px" data-en="Every request bound to its institution (RBAC)">Chaque requête liée à son établissement (RBAC)</span></div>
          <div style="display:flex;gap:11px;align-items:center;border-bottom:1px solid var(--ln);padding-bottom:11px"><span aria-hidden="true" style="width:20px;height:20px;border-radius:6px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span><span style="font-size:14.5px" data-en="Password-free OTP login for parents">Connexion OTP sans mot de passe pour les parents</span></div>
          <div style="display:flex;gap:11px;align-items:center;border-bottom:1px solid var(--ln);padding-bottom:11px"><span aria-hidden="true" style="width:20px;height:20px;border-radius:6px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span><span style="font-size:14.5px" data-en="Configurable caps &amp; flagged transactions">Plafonds configurables &amp; transactions signalées</span></div>
          <div style="display:flex;gap:11px;align-items:center"><span aria-hidden="true" style="width:20px;height:20px;border-radius:6px;background:var(--s-soft);color:var(--t-brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">✓</span><span style="font-size:14.5px" data-en="Dispute queue and operator health, live">File de litiges et santé des opérateurs, en direct</span></div>
        </div>
        <p style="font-size:12.5px;line-height:1.55;color:var(--t-faint);margin:18px 0 0" data-en="Payment services subject to BCC authorisation. HTTPS end to end, data hosted with an audited provider.">Services de paiement soumis à l'agrément de la BCC. HTTPS de bout en bout, données hébergées chez un prestataire audité.</p>
      </div>
    </div>
  </section>

  <!-- ============ 09 · TÉMOIGNAGES ============ -->
  <section id="temoignages" style="background:var(--s-card);padding:clamp(58px,7vw,100px) 22px">
    <div id="grid-temoin" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr);gap:clamp(28px,4vw,52px);align-items:center">
        <div data-reveal="">
          <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="09 · Pilot institutions">09 · Établissements pilotes</span>
          <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,40px);line-height:1.14;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="Don't just take our word for it">Ne nous croyez pas sur parole</h2>
          <p style="font-size:15px;line-height:1.66;color:var(--t-muted);margin:12px 0 0;max-width:40ch;text-wrap:pretty" data-en="Quotes anonymised at our partners' request during the pilot phase.">Propos anonymisés à la demande de nos partenaires pendant la phase pilote.</p>
          <a href="#partenariat" style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;border:1px solid var(--ln);border-radius:999px;padding:12px 20px;font-size:14.5px;font-weight:600;color:var(--t-brand)" style-hover="border-color:var(--ln);background:var(--s-soft);color:var(--t-brand)"><span data-en="Become a pilot institution">Devenir établissement pilote</span> <span aria-hidden="true">›</span></a>
        </div>
        <div id="grid-quotes" style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          <blockquote data-reveal="" style="margin:0;background:var(--s-soft);border-radius:20px;padding:24px;display:flex;flex-direction:column">
            <span aria-hidden="true" style="color:#FCB326;font-size:14px;letter-spacing:.12em">★★★★★</span>
            <p style="font-size:14.5px;line-height:1.66;color:var(--t-ink);margin:12px 0 0" data-en="“The treasurer no longer rebuilds a spreadsheet on Monday morning. She opens the back office and the balance is already right.”">« Notre comptable ne reconstruit plus un tableur le lundi matin. Elle ouvre le back-office et le solde est déjà juste. »</p>
            <footer style="margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:10px">
              <img src="/images/bienvenue/img_67cb504c.png" alt="" width="210" height="210" style="width:40px;height:40px;border-radius:50%;background:var(--s-soft);object-fit:cover;flex-shrink:0">
              <span style="font-size:12.5px;line-height:1.4;color:var(--t-muted)" data-en="Finance director&lt;br /&gt;Higher institute, Kinshasa">Directrice financière<br>Institut supérieur, Kinshasa</span>
            </footer>
          </blockquote>
          <blockquote data-reveal="" style="margin:0;background:var(--s-soft);border-radius:20px;padding:24px;display:flex;flex-direction:column">
            <span aria-hidden="true" style="color:#FCB326;font-size:14px;letter-spacing:.12em">★★★★★</span>
            <p style="font-size:14.5px;line-height:1.66;color:var(--t-ink);margin:12px 0 0" data-en="“Parents asked for the QR code themselves. Nobody wants to travel with cash for a tuition instalment any more.”">« Les parents ont réclamé le QR code eux-mêmes. Plus personne ne veut se déplacer avec du liquide pour une tranche. »</p>
            <footer style="margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:10px">
              <img src="/images/bienvenue/img_095a20c8.png" alt="" width="215" height="215" style="width:40px;height:40px;border-radius:50%;background:var(--s-soft);object-fit:cover;flex-shrink:0">
              <span style="font-size:12.5px;line-height:1.4;color:var(--t-muted)" data-en="Head of school&lt;br /&gt;Secondary school, Gombe">Chef d'établissement<br>École secondaire, Gombe</span>
            </footer>
          </blockquote>
        </div>
    </div>
  </section>

  <!-- ============ 10 · FAQ ============ -->
  <section id="faq" style="background:var(--s-soft);padding:clamp(58px,7vw,100px) 22px">
    <div id="grid-faq" style="max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.6fr) minmax(0,1.4fr);gap:clamp(26px,4vw,52px);align-items:start">
      <div data-reveal="">
        <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-card);border-radius:999px;padding:6px 12px" data-en="10 · Questions">10 · Questions</span>
        <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,40px);line-height:1.14;letter-spacing:-.028em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="Asked before every signature.">Posées avant chaque signature.</h2>
        <p style="font-size:15px;line-height:1.66;color:var(--t-muted);margin:12px 0 0;max-width:34ch" data-en="Something missing? Ask us directly — we answer within one business day.">Il manque quelque chose ? Demandez-nous — nous répondons sous un jour ouvré.</p>
      </div>
      <div style="display:grid;gap:10px">
        <details data-reveal="" style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">
          <summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)"><span data-en="Do we need to install an app?">Faut-il installer une application ?</span><span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>
          <p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0" data-en="No. ABC Pay is a web app: it opens in the browser, runs on entry-level phones and is built to stay light on a 3G connection.">Non. ABC Pay est une web app : elle s'ouvre dans le navigateur, tourne sur téléphone d'entrée de gamme et reste légère en 3G.</p>
        </details>
        <details data-reveal="" style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">
          <summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)"><span data-en="Who pays the service fee?">Qui paie les frais de service ?</span><span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>
          <p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0" data-en="Never the parent. The payer settles the exact amount shown by the institution; the ABC Pay commission is taken on the institution side at settlement.">Jamais le parent. Le payeur règle le montant exact affiché par l'établissement ; la commission ABC Pay est prélevée côté établissement au reversement.</p>
        </details>
        <details data-reveal="" style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">
          <summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)"><span data-en="Must we hand over our student database?">Devons-nous confier notre base d'apprenants ?</span><span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>
          <p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0" data-en="No. In payment-only mode the student number is the key and you reconcile in your own system; fee management is an opt-in.">Non. En mode paiement seul, le matricule sert de clé et vous réconciliez dans votre système ; la gestion des frais est une option.</p>
        </details>
        <details data-reveal="" style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">
          <summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)"><span data-en="Which currency will be displayed?">Quelle devise sera affichée ?</span><span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>
          <p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0" data-en="Yours: USD or CDF, set per institution. Aggregates are converted to a base currency using a configurable rate, so a mixed portfolio still totals correctly.">La vôtre : USD ou CDF, réglée par établissement. Les agrégats sont convertis en devise de base via un taux configurable, pour que des paiements mixtes s'additionnent juste.</p>
        </details>
        <details data-reveal="" style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">
          <summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)"><span data-en="How long does onboarding take?">Combien de temps prend l'onboarding ?</span><span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>
          <p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0" data-en="One working session: KYB documents, settlement account, fee schedule, management account and QR code. Your team is trained on the back office the same day.">Une séance de travail : documents KYB, compte de reversement, barème de frais, compte direction et QR code. Votre équipe est formée au back-office le même jour.</p>
        </details>
      </div>
    </div>
  </section>

  <!-- ============ CTA BANNER ============ -->
  <section style="background:var(--s-card);padding:clamp(34px,4vw,58px) 22px">
    <div data-reveal="" style="max-width:1300px;margin:0 auto;background:#00279C;border-radius:26px;padding:clamp(28px,3.6vw,48px);display:flex;flex-wrap:wrap;gap:22px;align-items:center;justify-content:space-between">
      <div style="max-width:56ch">
        <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(22px,2.8vw,34px);line-height:1.15;letter-spacing:-.025em;margin:0;color:#fff;text-wrap:balance" data-en="Ready to connect your money to ABC Pay?">Prêt à connecter votre argent à ABC Pay ?</h2>
        <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,.78);margin:10px 0 0" data-en="A demo on your own figures, a settlement simulation, a plan for your first hundred payers.">Une démo sur vos propres chiffres, une simulation de reversement, un plan pour vos cent premiers payeurs.</p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:11px">
        <a href="#partenariat" style="display:inline-flex;align-items:center;gap:8px;background:#FCB326;color:#00279C;font-weight:700;font-size:15.5px;padding:15px 26px;border-radius:999px" style-hover="background:#ffc44f;color:#00279C"><span data-en="Book a demo">Demander une démo</span> <span aria-hidden="true">›</span></a>
        <a href="#faq" style="display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.38);color:#fff;font-weight:600;font-size:15.5px;padding:15px 24px;border-radius:999px" style-hover="background:rgba(255,255,255,.12);color:#fff;border-color:#fff"><span data-en="Read the FAQ">Lire la FAQ</span></a>
      </div>
    </div>
  </section>

  <!-- ============ 11 · PARTENARIAT ============ -->
  <section id="partenariat" style="background:var(--s-card);padding:clamp(48px,6vw,90px) 22px">
    <div id="grid-partenariat" style="max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(30px,4.5vw,58px);align-items:start">
      <div>
        <span data-reveal="" style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-brand);background:var(--s-soft);border-radius:999px;padding:6px 12px" data-en="11 · Partnership">11 · Partenariat</span>
        <h2 data-reveal="" style="font-family:Sora,sans-serif;font-weight:800;font-size:clamp(27px,3.5vw,44px);line-height:1.1;letter-spacing:-.03em;margin:16px 0 0;color:var(--t-ink);text-wrap:balance" data-en="Let's talk about your institution.">Parlons de votre établissement.</h2>
        <p data-reveal="" style="font-size:16px;line-height:1.68;color:var(--t-muted);margin:14px 0 0;max-width:46ch;text-wrap:pretty" data-en="Schools, universities, networks, operators, investors: tell us where you are and we come back with a concrete plan — not a brochure.">Écoles, universités, réseaux, opérateurs, investisseurs : dites-nous où vous en êtes, nous revenons avec un plan concret — pas une brochure.</p>
        <div style="display:grid;gap:10px;margin-top:24px;max-width:420px">
          <div data-reveal="" style="display:flex;gap:12px;align-items:center;border:1px solid var(--ln);border-radius:14px;padding:14px 16px">
            <span aria-hidden="true" style="color:var(--t-brand);font-weight:800">☎</span><div><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);font-weight:700" data-en="Phone / WhatsApp">Téléphone / WhatsApp</div><div style="font-weight:600;font-size:15px;color:var(--t-ink)">+243 000 000 000</div></div>
          </div>
          <div data-reveal="" style="display:flex;gap:12px;align-items:center;border:1px solid var(--ln);border-radius:14px;padding:14px 16px">
            <span aria-hidden="true" style="color:var(--t-brand);font-weight:800">✉</span><div><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);font-weight:700" data-en="Partnerships">Partenariats</div><div style="font-weight:600;font-size:15px;color:var(--t-ink)">partenariats@abcpay.cd</div></div>
          </div>
          <div data-reveal="" style="display:flex;gap:12px;align-items:center;border:1px solid var(--ln);border-radius:14px;padding:14px 16px">
            <span aria-hidden="true" style="color:var(--t-brand);font-weight:800">⌖</span><div><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--t-faint);font-weight:700" data-en="Office">Bureau</div><div style="font-weight:600;font-size:15px;color:var(--t-ink)">Gombe, Kinshasa — RDC</div></div>
          </div>
          <p style="font-family:ui-monospace,monospace;font-size:11px;color:var(--t-faint);margin:0" data-en="placeholder contact details — to be replaced">coordonnées provisoires — à remplacer</p>
        </div>
      </div>

      <div data-reveal="" style="background:var(--s-soft);border:1px solid var(--ln);border-radius:24px;padding:clamp(22px,3vw,32px)">
        <div data-if="sent" style="display:none">
          <div style="padding:24px 6px;text-align:center">
            <div aria-hidden="true" style="width:50px;height:50px;border-radius:50%;background:var(--s-ok-soft);color:var(--t-ok);display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:800;margin:0 auto">✓</div>
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:19px;margin:16px 0 0;color:var(--t-ink)" data-en="Request received">Demande reçue</h3>
            <p style="font-size:14.5px;line-height:1.6;color:var(--t-muted);margin:9px 0 0" data-en="Our partnerships team gets back to you within one business day.">Notre équipe partenariats vous répond sous un jour ouvré.</p>
          </div>
        </div>
        <div data-if="notSent">
          <form data-act-submit="submit" style="display:grid;gap:13px">
            <h3 style="font-family:Sora,sans-serif;font-weight:700;font-size:19px;margin:0;color:var(--t-ink)" data-en="Request a demo">Demander une démo</h3>
            <div style="display:grid;gap:6px">
              <label for="f-etab" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Institution *">Établissement *</label>
              <input id="f-etab" name="etablissement" required="" data-en-placeholder="Higher institute, Kinshasa" placeholder="Institut supérieur, Kinshasa" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%">
            </div>
            <div id="f-row" style="display:grid;grid-template-columns:1fr 1fr;gap:13px">
              <div style="display:grid;gap:6px">
                <label for="f-nom" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Contact *">Contact *</label>
                <input id="f-nom" name="nom" required="" data-en-placeholder="Full name" placeholder="Nom complet" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%">
              </div>
              <div style="display:grid;gap:6px">
                <label for="f-tel" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Phone / WhatsApp *">Téléphone / WhatsApp *</label>
                <input id="f-tel" name="telephone" type="tel" required="" data-en-placeholder="+243 … (WhatsApp)" placeholder="+243 … (WhatsApp)" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%">
              </div>
            </div>
            <div style="display:grid;gap:6px">
              <label for="f-mail" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Email">Email</label>
              <input id="f-mail" name="email" type="email" data-en-placeholder="name@institution.cd" placeholder="nom@etablissement.cd" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%">
            </div>
            <div style="display:grid;gap:6px">
              <label id="f-canal-label" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="How should we contact you?">Comment vous recontacter&nbsp;?</label>
              <div id="f-canal-group" class="abc-seg" role="radiogroup" aria-labelledby="f-canal-label">
                <button type="button" class="abc-seg__btn is-active" data-canal="whatsapp" role="radio" aria-checked="true">WhatsApp</button>
                <button type="button" class="abc-seg__btn" data-canal="email" role="radio" aria-checked="false">Email</button>
                <button type="button" class="abc-seg__btn" data-canal="appel" role="radio" aria-checked="false" data-en="Call">Appel</button>
              </div>
              <input id="f-canal" name="canal" type="hidden" value="whatsapp">
            </div>
            <div style="display:grid;gap:6px">
              <label for="f-type" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Profile">Profil</label>
              <select id="f-type" name="profil" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%">
                <option data-en="School (primary / secondary)">École (primaire / secondaire)</option>
                <option data-en="Higher education / university">Enseignement supérieur / université</option>
                <option data-en="School network or group">Réseau ou groupe scolaire</option>
                <option data-en="Mobile money operator">Opérateur mobile money</option>
                <option data-en="Investor">Investisseur</option>
                <option data-en="Other">Autre</option>
              </select>
            </div>
            <div style="display:grid;gap:6px">
              <label for="f-msg" style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted)" data-en="Message">Message</label>
              <textarea id="f-msg" name="message" rows="3" data-en-placeholder="Number of learners, current collection method…" placeholder="Nombre d'apprenants, mode d'encaissement actuel…" style="font-family:Inter,sans-serif;font-size:15px;padding:13px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--s-card);color:var(--t-ink);width:100%;resize:vertical"></textarea>
            </div>
            <button type="submit" style="font-family:Inter,sans-serif;border:0;cursor:pointer;background:#00279C;color:#fff;font-weight:700;font-size:15.5px;padding:15px;border-radius:999px" style-hover="background:#0B3FD6">
              <span data-en="Send my request">Envoyer ma demande</span>
            </button>
            <p style="font-size:11.5px;color:var(--t-faint);margin:0;line-height:1.5" data-en="* Required fields. We usually reply within one business day.">* Champs obligatoires. Nous répondons généralement sous un jour ouvré.</p>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ FOOTER ============ -->
  <footer style="background:#001A63;color:rgba(255,255,255,.72);padding:clamp(44px,5vw,68px) 22px 24px;overflow:hidden">
    <div id="grid-footer" style="max-width:1300px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1.3fr;gap:clamp(22px,3vw,38px)">
      <div>
        <img src="/logo.png" alt="ABC Pay" style="height:44px;width:auto;display:block;border-radius:8px">
        <p style="font-family:Sora,sans-serif;font-weight:600;color:#FCB326;font-size:13px;margin:12px 0 0;letter-spacing:.03em">The Connected Money</p>
        <p style="font-size:13.5px;line-height:1.6;margin:9px 0 0;max-width:30ch" data-en="Payment platform for the DRC: send, receive, pay, collect. Tuition is our product for school and academic fees.">Plateforme de paiement pour la RDC : envoyer, recevoir, payer, encaisser. Tuition est notre produit pour les frais scolaires et académiques.</p>
        <div style="display:flex;gap:8px;margin-top:16px">
          <a href="#partenariat" aria-label="LinkedIn" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)">in</a>
          <a href="#partenariat" aria-label="X" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)">X</a>
          <a href="#partenariat" aria-label="Facebook" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)">f</a>
          <a href="#partenariat" aria-label="WhatsApp" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700" style-hover="background:#FCB326;color:#00279C;border-color:var(--ln)">wa</a>
        </div>
      </div>
      <div>
        <div style="font-family:Sora,sans-serif;font-weight:700;color:#fff;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase" data-en="Product">Produit</div>
        <div style="display:grid;gap:9px;margin-top:14px;font-size:14px">
          <a href="#tuition" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Tuition</a>
          <a href="#canaux" data-en="Payment channels" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Canaux de paiement</a>
          <a href="#espaces" data-en="Back office" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Back-office</a>
          <a href="#securite" data-en="Security" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Sécurité</a>
        </div>
      </div>
      <div>
        <div style="font-family:Sora,sans-serif;font-weight:700;color:#fff;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase" data-en="Institutions">Établissements</div>
        <div style="display:grid;gap:9px;margin-top:14px;font-size:14px">
          <a href="#metiers" data-en="Primary &amp; secondary" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Primaire &amp; secondaire</a>
          <a href="#metiers" data-en="Higher education" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Enseignement supérieur</a>
          <a href="#metiers" data-en="Networks" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Réseaux scolaires</a>
          <a href="#temoignages" data-en="Pilot institutions" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Établissements pilotes</a>
        </div>
      </div>
      <div>
        <div style="font-family:Sora,sans-serif;font-weight:700;color:#fff;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase" data-en="Company">Société</div>
        <div style="display:grid;gap:9px;margin-top:14px;font-size:14px">
          <a href="#apropos" data-en="About us" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">À propos</a>
          <a href="#partenariat" data-en="Become a partner" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Devenir partenaire</a>
          <a href="#faq" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">FAQ</a>
          <a href="#partenariat" data-en="Contact" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">Contact</a>
        </div>
      </div>
      <div>
        <div style="font-family:Sora,sans-serif;font-weight:700;color:#fff;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase" data-en="Newsletter">Infolettre</div>
        <p style="font-size:13.5px;line-height:1.6;margin:12px 0 0" data-en="One email per term: what changes for institutions in the DRC.">Un e-mail par trimestre : ce qui change pour les établissements en RDC.</p>
        <form data-act-submit="subscribe" style="display:flex;gap:8px;margin-top:13px">
          <label for="f-news" style="position:absolute;left:-9999px" data-en="Your email">Votre e-mail</label>
          <input id="f-news" name="email" type="email" required="" data-en-placeholder="Your email" placeholder="Votre e-mail" style="flex:1;min-width:0;font-family:Inter,sans-serif;font-size:14px;padding:11px 13px;border:1px solid rgba(255,255,255,.24);border-radius:12px;background:rgba(255,255,255,.06);color:#fff">
          <button type="submit" aria-label="S'inscrire" style="flex-shrink:0;width:42px;height:42px;border:0;border-radius:12px;background:#FCB326;color:#00279C;font-size:16px;font-weight:800;cursor:pointer;font-family:Inter,sans-serif">›</button>
        </form>
        <p id="newsok" style="display:none;font-size:12.5px;color:#FCB326;margin:9px 0 0" data-en="Thank you — you're on the list.">Merci — vous êtes inscrit.</p>
      </div>
    </div>

    <div aria-hidden="true" style="max-width:1300px;margin:clamp(30px,4vw,52px) auto 0;font-family:Sora,sans-serif;font-weight:800;font-size:clamp(56px,13vw,190px);line-height:1.08;letter-spacing:-.05em;color:rgba(255,255,255,.09);white-space:nowrap;overflow:hidden;padding-bottom:.06em">abc pay<span style="color:#FCB326">.</span></div>

    <div style="max-width:1300px;margin:14px auto 0;padding-top:18px;border-top:1px solid rgba(255,255,255,.16);display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;justify-content:space-between;font-size:12.5px;color:rgba(255,255,255,.55)">
      <span>© 2026 ABC Pay — <span data-en="All rights reserved.">Tous droits réservés.</span></span>
      <nav style="display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center">
        <a href="/comment-ca-marche" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326" data-en="How it works">Comment ça marche</a>
        <a href="/tarification" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326" data-en="Pricing">Tarification</a>
        <a href="/faq" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326">FAQ</a>
        <a href="/conditions" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326" data-en="Terms of use">Conditions d'utilisation</a>
        <a href="/remboursement" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326" data-en="Refund policy">Politique de remboursement</a>
        <a href="/confidentialite" style="color:rgba(255,255,255,.72)" style-hover="color:#FCB326" data-en="Privacy">Confidentialité</a>
      </nav>
      <span data-en="Payment services subject to BCC authorisation.">Services de paiement soumis à l'agrément de la BCC.</span>
    </div>
  </footer>
</div>`;
