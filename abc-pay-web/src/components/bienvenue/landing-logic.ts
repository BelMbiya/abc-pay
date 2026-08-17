/**
 * Comportements de la landing /bienvenue.
 *
 * Portage fidèle de la logique du design d'origine (framework « DC ») en une
 * fonction d'initialisation vanille pilotée par le DOM. Tout est impératif et
 * borné au sous-arbre `root` : bilingue FR/EN (échange de innerHTML via
 * data-en), menu mobile, modale vidéo, parcours Tuition (3 étapes), carrousel
 * secteurs, sélecteur des 3 espaces, révélations au scroll (IntersectionObserver),
 * parallax léger, diagramme des canaux, et la responsivité — qui est pilotée par
 * JS dans ce design (aucune media-query CSS).
 *
 * Renvoie une fonction de nettoyage (timers / listeners) pour le démontage React.
 */

type Dict = Record<string, () => void>;

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll<T>(sel));

/** Base de l'API (câblage de la landing au vrai système). */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Erreur HTTP portant le statut, pour un message utilisateur adapté (429, 422…). */
class HttpError extends Error {
  constructor(public readonly status: number) {
    super("http " + status);
  }
}

async function apiPostJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

async function apiGetJson(path: string): Promise<unknown> {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error("http " + res.status);
  return res.json();
}

export function initLanding(root: HTMLElement): () => void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const factor = reduceMotion ? 0 : 1; // intensité « spectaculaire »
  const reduce = reduceMotion || factor === 0;

  let lang: "fr" | "en" = "fr";
  let sector = 0;
  let esp: number | null = null;
  let step = 0;
  let chip = 0;

  let ioObs: IntersectionObserver | null = null;
  let stepTimer: ReturnType<typeof setInterval> | null = null;
  let chipTimer: ReturnType<typeof setInterval> | null = null;
  let resumeTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanups: Array<() => void> = [];

  /* ----------------------------- Bilingue FR/EN ----------------------------- */
  function setLang(next: "fr" | "en") {
    if (next === lang) return;
    $<HTMLElement>(root, "[data-en]").forEach((el) => {
      if (!el.dataset.fr) el.dataset.fr = el.innerHTML;
      el.innerHTML = next === "en" ? el.dataset.en ?? "" : el.dataset.fr ?? "";
    });
    $<HTMLElement>(root, "[data-en-placeholder]").forEach((el) => {
      if (!el.dataset.frPlaceholder) el.dataset.frPlaceholder = el.getAttribute("placeholder") ?? "";
      el.setAttribute(
        "placeholder",
        next === "en" ? el.dataset.enPlaceholder ?? "" : el.dataset.frPlaceholder ?? "",
      );
    });
    const fr = root.querySelector<HTMLElement>("#lang-fr");
    const en = root.querySelector<HTMLElement>("#lang-en");
    const base =
      "border:0;cursor:pointer;font-family:var(--font-inter),sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;";
    const on = "background:#FCB326;color:#00279C";
    const off = "background:transparent;color:rgba(255,255,255,.7)";
    if (fr) fr.setAttribute("style", base + (next === "fr" ? on : off));
    if (en) en.setAttribute("style", base + (next === "en" ? on : off));
    document.documentElement.lang = next;
    lang = next;
  }

  /* ------------------------------ Carrousel secteurs ------------------------ */
  function moveSector(dir: number) {
    const cards = $<HTMLElement>(root, "#sectortrack [data-sector]");
    if (!cards.length) return;
    const n = cards.length;
    const perView = window.innerWidth < 700 ? 1 : window.innerWidth < 1080 ? 2 : 3;
    sector = (sector + dir + n) % n;
    cards.forEach((c, i) => {
      const rel = (i - sector + n) % n;
      const show = rel < perView;
      c.style.display = show ? "flex" : "none";
      c.style.order = String(rel);
      if (show) {
        c.style.animation = "none";
        void c.offsetWidth;
        c.style.animation = "fadeUp .45s both";
      }
    });
  }

  /* ------------------------------ Sélecteur d'espaces ----------------------- */
  function setEspace(idx: number) {
    esp = idx;
    const wide = window.innerWidth >= 980;
    $<HTMLElement>(root, "#grid-espaces [data-espace]").forEach((c, i) => {
      const on = i === idx;
      c.style.background = on ? "#00279C" : "var(--s-soft)";
      c.style.boxShadow = on && wide ? "0 34px 70px -44px rgba(11,26,68,.8)" : "none";
      c.style.zIndex = on ? "2" : "1";
      c.style.transform = "none";
      c.style.borderRadius = !wide ? "14px" : "0";
      c.style.marginBottom = !wide ? "10px" : "0";
      c.setAttribute("aria-pressed", on ? "true" : "false");
      const q = (s: string) => c.querySelector<HTMLElement>(s);
      const icon = q("[data-esp-icon]");
      const lab = q("[data-esp-label]");
      const tit = q("[data-esp-title]");
      const txt = q("[data-esp-text]");
      const cta = q("[data-esp-cta]");
      if (icon) {
        icon.style.background = on ? "#FCB326" : "var(--s-card)";
        icon.style.color = "#00279C";
      }
      if (lab) lab.style.color = on ? "#FCB326" : "var(--t-faint)";
      if (tit) tit.style.color = on ? "#fff" : "var(--t-ink)";
      if (txt) txt.style.color = on ? "rgba(255,255,255,.84)" : "var(--t-muted)";
      if (cta) cta.style.display = on ? "inline-flex" : "none";
    });
  }

  /* -------------------------------- Étapes Tuition -------------------------- */
  function setStepUI(idx: number) {
    step = idx;
    // Diaporama hero synchronisé aux étapes Tuition (nouveau design).
    $<HTMLElement>(root, "#hero-stage [data-heroshot]").forEach((im, i) => {
      const on = i === idx;
      im.style.opacity = on ? "1" : "0";
      im.style.transform = on ? "scale(1) translateY(0)" : "scale(1.05) translateY(12px)";
      im.style.zIndex = on ? "2" : "1";
    });
    $<HTMLElement>(root, "#steprail [data-step]").forEach((s, i) => {
      const on = i === idx;
      s.style.background = on ? "#00279C" : "var(--s-card)";
      s.style.color = on ? "#fff" : "var(--t-faint)";
      s.style.borderColor = on ? "#00279C" : "var(--ln)";
      s.style.transform = on ? "scale(1.14)" : "none";
      s.setAttribute("aria-selected", on ? "true" : "false");
    });
    $<HTMLElement>(root, "#steprail [data-steprailfill]").forEach((f, i) => {
      f.style.transform = i < idx ? "scaleY(1)" : "scaleY(0)";
    });
    $<HTMLElement>(root, "#stepcap [data-stepcap]").forEach((c, i) => {
      c.style.display = i === idx ? "inline" : "none";
    });
    const ring = "0 0 0 2px #FCB326";
    const tx = root.querySelector<HTMLElement>("#tx-list");
    if (tx) tx.style.boxShadow = idx === 1 ? ring : "none";
    ["fc-recu", "fc-alerte"].forEach((id) => {
      const el = root.querySelector<HTMLElement>("#" + id);
      if (!el) return;
      el.style.transition = "box-shadow .4s ease";
      el.style.boxShadow = idx === 2 ? ring + ", 0 24px 48px -30px rgba(11,26,68,.5)" : "";
    });
  }

  function pickStep(i: number) {
    if (stepTimer) {
      clearInterval(stepTimer);
      stepTimer = null;
    }
    setStepUI(i);
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (reduce) return;
      stepTimer = setInterval(() => setStepUI((step + 1) % 3), 5200);
    }, 18000);
  }

  /* -------------------------------- Actions liées --------------------------- */
  const acts: Dict = {
    setFr: () => setLang("fr"),
    setEn: () => setLang("en"),
    prevSector: () => moveSector(-1),
    nextSector: () => moveSector(1),
    pickEsp0: () => setEspace(0),
    pickEsp1: () => setEspace(1),
    pickEsp2: () => setEspace(2),
    goStep1: () => pickStep(0),
    goStep2: () => pickStep(1),
    goStep3: () => pickStep(2),
    toggleMenu: () => {
      const menu = root.querySelector<HTMLElement>("#mobilemenu");
      if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
    },
    toggleTheme: () => {
      const next = effectiveDark() ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* stockage indisponible */
      }
      applyTheme(next);
    },
  };

  function bind(el: Element, ev: string, fn: (e: Event) => void) {
    el.addEventListener(ev, fn);
    cleanups.push(() => el.removeEventListener(ev, fn));
  }

  $(root, "[data-act]").forEach((el) => {
    const fn = acts[el.getAttribute("data-act") ?? ""];
    if (fn) bind(el, "click", fn);
  });

  /* Canal de contact préféré — toggle segmenté (WhatsApp / Email / Appel). */
  const canalGroup = root.querySelector<HTMLElement>("#f-canal-group");
  const canalInput = root.querySelector<HTMLInputElement>("#f-canal");
  if (canalGroup && canalInput) {
    const canalBtns = Array.from(canalGroup.querySelectorAll<HTMLButtonElement>("button[data-canal]"));
    const mailInput = root.querySelector<HTMLInputElement>("#f-mail");
    const setCanal = (active: HTMLButtonElement) => {
      canalBtns.forEach((b) => {
        const on = b === active;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.classList.toggle("is-active", on); // état visuel via CSS (CSP-safe)
      });
      canalInput.value = active.getAttribute("data-canal") ?? "whatsapp";
      // Choisir « Email » comme canal rend l'adresse email obligatoire (repli serveur : required_if).
      if (mailInput) mailInput.required = canalInput.value === "email";
    };
    canalBtns.forEach((b) => bind(b, "click", () => setCanal(b)));
  }

  $(root, "[data-act-submit]").forEach((el) => {
    const kind = el.getAttribute("data-act-submit");
    if (kind === "submit") {
      // Demande de démo / partenariat → enregistrée réellement (table leads).
      bind(el, "submit", async (e) => {
        e.preventDefault();
        const form = el as HTMLFormElement;
        const val = (id: string) =>
          (root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#" + id)?.value ?? "").trim();
        const revealSent = () => {
          const sent = root.querySelector<HTMLElement>('[data-if="sent"]');
          const notSent = root.querySelector<HTMLElement>('[data-if="notSent"]');
          if (notSent) notSent.style.display = "none";
          if (sent) sent.style.display = "block";
        };
        const showError = (msg: string) => {
          let err = form.querySelector<HTMLElement>(".abc-form-error");
          if (!err) {
            err = document.createElement("p");
            err.className = "abc-form-error";
            err.setAttribute("role", "alert");
            err.style.cssText = "color:#E5484D;font-size:13px;font-weight:600;margin:0;line-height:1.5";
            form.appendChild(err);
          }
          err.textContent = msg;
          err.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };

        // Anti double-envoi : verrouille le bouton pendant la requête.
        const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        const btnLabel = btn?.querySelector<HTMLElement>("span");
        const original = btnLabel?.textContent ?? "";
        if (btn) btn.disabled = true;
        if (btnLabel) btnLabel.textContent = "Envoi…";
        form.querySelector(".abc-form-error")?.remove();

        try {
          await apiPostJson("/api/v1/leads", {
            establishment_name: val("f-etab"),
            contact_name: val("f-nom"),
            phone: val("f-tel"),
            email: val("f-mail") || null,
            contact_channel: val("f-canal") || "whatsapp",
            profile: val("f-type") || null,
            message: val("f-msg") || null,
          });
          revealSent();
        } catch (err) {
          const status = err instanceof HttpError ? err.status : 0;
          if (btn) btn.disabled = false;
          if (btnLabel) btnLabel.textContent = original;
          if (status === 429) {
            showError("Trop de tentatives d'envoi. Patiente une minute puis réessaie.");
          } else if (status === 422) {
            showError("Vérifie les champs : établissement, contact et téléphone sont requis (email valide s'il est renseigné).");
          } else {
            showError("Envoi impossible pour le moment. Réessaie, ou écris-nous à partenariats@abcpay.cd.");
          }
        }
      });
    } else if (kind === "subscribe") {
      bind(el, "submit", (e) => {
        e.preventDefault();
        const ok = root.querySelector<HTMLElement>("#newsok");
        if (ok) ok.style.display = "block";
        (e.target as HTMLFormElement).reset();
      });
    }
  });

  /* ------------------------------ Thème clair / sombre --------------------- */
  const pageEl = root.querySelector<HTMLElement>("#page") ?? root;
  const THEME_KEY = "abcpay_theme";
  const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const effectiveDark = () => {
    const t = pageEl.getAttribute("data-theme");
    return t ? t === "dark" : systemDark();
  };
  const applyTheme = (mode: "dark" | "light" | null) => {
    if (mode) pageEl.setAttribute("data-theme", mode);
    else pageEl.removeAttribute("data-theme");
    const btn = root.querySelector<HTMLElement>("#abc-theme-toggle");
    if (btn) {
      const dark = effectiveDark();
      btn.textContent = dark ? "☀" : "☾";
      btn.setAttribute("aria-label", dark ? "Passer en mode clair" : "Passer en mode sombre");
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
    }
  };
  let storedTheme: string | null = null;
  try {
    storedTheme = localStorage.getItem(THEME_KEY);
  } catch {
    /* stockage indisponible : on reste en mode système */
  }
  applyTheme(storedTheme === "dark" || storedTheme === "light" ? storedTheme : null);
  // Le bouton #abc-theme-toggle est statique dans le markup (data-act="toggleTheme").
  // Suit les changements de thème système tant que l'utilisateur n'a pas tranché.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    if (!pageEl.getAttribute("data-theme")) applyTheme(null);
  };
  mq.addEventListener("change", onScheme);
  cleanups.push(() => mq.removeEventListener("change", onScheme));

  /* ---------------------- Révélations au scroll + barres -------------------- */
  const nav = root.querySelector<HTMLElement>("#nav");
  const onNav = () => {
    if (nav) nav.style.boxShadow = window.scrollY > 30 ? "0 12px 30px -22px rgba(11,26,68,.5)" : "none";
  };

  const items = $<HTMLElement>(root, "[data-reveal]");
  const bars = $<HTMLElement>(root, "[data-bar]");
  const growbars = $<HTMLElement>(root, "[data-growbar]");
  if (!reduce && "IntersectionObserver" in window) {
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition =
        "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)";
    });
    bars.forEach((b) => {
      b.style.transform = "scaleX(0)";
    });
    growbars.forEach((b, i) => {
      b.style.transform = "scaleY(0)";
      b.style.transition = "transform .8s cubic-bezier(.16,1,.3,1) " + (0.5 + i * 0.08) + "s";
    });
    requestAnimationFrame(() =>
      growbars.forEach((b) => {
        b.style.transform = "scaleY(1)";
      }),
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en, i) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          if (el.hasAttribute("data-bar")) {
            el.style.transition = "transform .7s cubic-bezier(.16,1,.3,1) .15s";
            el.style.transform = "scaleX(1)";
          } else {
            el.style.transitionDelay = i * 60 + "ms";
            el.style.opacity = "1";
            el.style.transform = "none";
          }
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    items.concat(bars).forEach((el) => io.observe(el));
    ioObs = io;
    setTimeout(() => {
      items.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      bars.forEach((b) => {
        b.style.transform = "scaleX(1)";
      });
    }, 7000);
  }

  /* ------------------------------ Diagramme canaux -------------------------- */
  const chips = $<HTMLElement>(root, "#canaux-chips [data-chip]");
  const paths = $<SVGPathElement>(root, "#canaux-svg path");
  const setChip = (k: number) => {
    chips.forEach((c, i) => {
      const on = i === k;
      c.style.background = on ? "#00279C" : "var(--s-card)";
      c.style.borderColor = on ? "#00279C" : "var(--ln)";
      c.style.color = on ? "#fff" : "var(--t-ink)";
      const dot = c.querySelector<HTMLElement>("[data-cdot]");
      if (dot) dot.style.background = on ? "#FCB326" : dot.dataset.color ?? "";
    });
    paths.forEach((pa, i) => {
      pa.style.stroke = i === k ? "#00279C" : "#DDE4F5";
      pa.style.strokeWidth = i === k ? "2" : "1";
    });
  };
  if (chips.length) {
    setChip(0);
    chips.forEach((c, i) => {
      const pick = () => {
        chip = i;
        setChip(i);
      };
      bind(c, "mouseenter", pick);
      bind(c, "click", pick);
      bind(c, "focus", pick);
    });
    if (!reduce)
      chipTimer = setInterval(() => {
        chip = (chip + 1) % chips.length;
        setChip(chip);
      }, 1900);
  }

  /* ------------------------------ Espaces + étapes init -------------------- */
  setEspace(1);
  $<HTMLElement>(root, "#grid-espaces [data-espace]").forEach((c, i) => {
    bind(c, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" || ke.key === " ") {
        e.preventDefault();
        setEspace(i);
      }
    });
  });
  setStepUI(0);
  if (!reduce) stepTimer = setInterval(() => setStepUI((step + 1) % 3), 5200);

  /* --------------------------------- Parallax ------------------------------ */
  const px = $<HTMLElement>(root, "[data-parallax]").map((el) => ({
    el,
    k: (parseFloat(el.dataset.parallax ?? "0") || 0) * factor,
  }));
  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    px.forEach((p) => {
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * p.k * -1;
      p.el.style.setProperty("translate", "0 " + off.toFixed(1) + "px");
    });
  };
  const onScroll = () => {
    onNav();
    if (!raf && !reduce) raf = requestAnimationFrame(tick);
  };
  onNav();
  if (!reduce) tick();
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener("scroll", onScroll));

  /* ----------------------- Responsivité pilotée par JS --------------------- */
  const cols: Record<string, string> = {};
  const gridIds = [
    "grid-hero", "grid-atouts", "grid-atouts-cards", "grid-probleme", "grid-canaux",
    "grid-tuition", "grid-tuition-head", "grid-capacites", "grid-apropos", "grid-espaces",
    "grid-securite", "grid-temoin", "grid-quotes", "grid-faq", "grid-partenariat",
    "grid-footer", "sectortrack", "mosaic", "hero-kpis",
  ];
  gridIds.forEach((id) => {
    const g = root.querySelector<HTMLElement>("#" + id);
    if (g) cols[id] = g.style.gridTemplateColumns;
  });
  const setCols = (id: string, v: string | null) => {
    const g = root.querySelector<HTMLElement>("#" + id);
    if (g) g.style.gridTemplateColumns = v || cols[id];
  };

  const applyResponsive = () => {
    const w = window.innerWidth;
    const compact = w < 1100;
    const navlinks = root.querySelector<HTMLElement>("#navlinks");
    const burger = root.querySelector<HTMLElement>("#burger");
    const menu = root.querySelector<HTMLElement>("#mobilemenu");
    const login = root.querySelector<HTMLElement>("#navlogin");
    if (navlinks) navlinks.style.display = compact ? "none" : "flex";
    if (burger) burger.style.display = compact ? "inline-flex" : "none";
    if (!compact && menu) menu.style.display = "none";
    if (login) login.style.display = w < 760 ? "none" : "inline-flex";
    const signup = root.querySelector<HTMLElement>("#nav-signup");
    if (signup) signup.style.display = w < 760 ? "none" : "inline-flex";
    const navcta = root.querySelector<HTMLElement>("#navcta");
    if (navcta) navcta.style.display = w < 520 ? "none" : "inline-flex";

    const stack = w < 980;
    ["grid-hero", "grid-probleme", "grid-canaux", "grid-tuition", "grid-securite",
      "grid-temoin", "grid-faq", "grid-partenariat", "grid-apropos"].forEach((id) =>
      setCols(id, stack ? "minmax(0,1fr)" : null),
    );
    setCols("grid-atouts", w < 1100 ? "minmax(0,1fr)" : null);
    setCols("grid-atouts-cards", w < 620 ? "1fr" : w < 1100 ? "repeat(2,1fr)" : "repeat(4,1fr)");
    setCols("grid-tuition-head", w < 980 ? "minmax(0,1fr)" : null);
    setCols("grid-capacites", w < 620 ? "1fr" : w < 1080 ? "repeat(2,1fr)" : "repeat(4,1fr)");
    setCols("grid-espaces", w < 980 ? "minmax(0,1fr)" : null);
    setCols("grid-quotes", w < 700 ? "1fr" : "repeat(2,1fr)");
    setCols("grid-footer", w < 640 ? "1fr" : w < 1080 ? "repeat(2,1fr)" : "1.4fr 1fr 1fr 1fr 1.3fr");
    setCols("mosaic", w < 560 ? "repeat(2,1fr)" : w < 900 ? "repeat(3,1fr)" : "repeat(4,1fr)");
    setCols("hero-kpis", w < 420 ? "1fr" : "repeat(3,1fr)");
    const perView = w < 700 ? 1 : w < 1080 ? 2 : 3;
    setCols("sectortrack", "repeat(" + perView + ",minmax(0,1fr))");
    ["media-probleme", "media-tuition"].forEach((id) => {
      const m = root.querySelector<HTMLElement>("#" + id);
      if (!m) return;
      m.style.maxWidth = stack ? "400px" : "";
      m.style.marginLeft = stack ? "auto" : "";
      m.style.marginRight = stack ? "auto" : "";
    });
    const track = root.querySelector<HTMLElement>("#sectortrack");
    if (track) {
      track.style.maxWidth = perView === 1 ? "420px" : "";
      track.style.marginLeft = perView === 1 ? "auto" : "";
      track.style.marginRight = perView === 1 ? "auto" : "";
    }
    setEspace(esp == null ? 1 : esp);
    const dg = root.querySelector<HTMLElement>("#diagramme");
    const cc = root.querySelector<HTMLElement>("#canaux-chips");
    const sv = root.querySelector<HTMLElement>("#canaux-svg");
    const narrow = w < 760;
    if (dg) {
      dg.style.gridTemplateColumns = narrow ? "minmax(0,1fr)" : "auto 54px minmax(0,1fr)";
      dg.style.maxWidth = narrow ? "460px" : "580px";
      dg.style.gap = narrow ? "18px" : "";
    }
    if (cc) cc.style.gridTemplateColumns = narrow ? "repeat(2,1fr)" : "1fr";
    if (sv) sv.style.display = narrow ? "none" : "block";
    const fr = root.querySelector<HTMLElement>("#f-row");
    if (fr) fr.style.gridTemplateColumns = w < 560 ? "1fr" : "1fr 1fr";
    const rail = root.querySelector<HTMLElement>("#steprail");
    if (rail) rail.style.display = w < 560 ? "none" : "flex";
    moveSector(0);
  };
  applyResponsive();
  // Révèle le contenu une fois la première passe responsive appliquée (évite le
  // flash de mise en page « desktop » avant l'exécution du JS sur mobile). On
  // écrit l'opacité en inline, sans état React : aucun re-render, donc aucun
  // risque de détacher les écouteurs déjà branchés.
  root.style.opacity = "1";
  window.addEventListener("resize", applyResponsive, { passive: true });
  cleanups.push(() => window.removeEventListener("resize", applyResponsive));
  // Déclencheurs plus fiables que le seul évènement resize (rotation, barre
  // d'URL mobile, zoom) : ResizeObserver sur la racine du document + orientation.
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => applyResponsive());
    ro.observe(document.documentElement);
    cleanups.push(() => ro.disconnect());
  }
  const onOrient = () => applyResponsive();
  window.addEventListener("orientationchange", onOrient);
  cleanups.push(() => window.removeEventListener("orientationchange", onOrient));

  /* --------------- Câblage des CTAs vers le vrai système (routes) ---------- */
  // On ajoute d'abord les entrées auth/vérif dans le menu mobile (une seule fois),
  // puis on branche la navigation par libellé — rejoué à chaque init (Strict Mode).
  const menuEl = root.querySelector<HTMLElement>("#mobilemenu");
  if (menuEl && !menuEl.querySelector("[data-abc-auth]")) {
    for (const [label, href] of [
      ["Vérifier un reçu", "/verifier-recu"],
      ["Se connecter", "/connexion"],
      ["Créer un compte", "/inscription"],
    ] as const) {
      const a = document.createElement("a");
      a.textContent = label;
      a.href = href;
      a.setAttribute("data-abc-auth", "");
      a.style.cssText = "display:block;padding:10px 0;font-weight:700;color:var(--t-brand)";
      menuEl.appendChild(a);
    }
  }

  const NAV_MAP: Array<[RegExp, string]> = [
    [/cr[ée]er un compte|create account/i, "/inscription"],
    [/se connecter|log ?in/i, "/connexion"],
    [/acc[èe]s [ée]tablissement|institution access/i, "/etablissement-connexion"],
    [/payer une scolarit|pay (a )?tuition/i, "/tuition"],
    [/mettre tuition en place|set up tuition|configurer mon/i, "/etablissement-connexion"],
    [/retrouver un re[çc]u|find a receipt|scanner un qr|scan a qr|v[ée]rifier un re[çc]u/i, "/verifier-recu"],
  ];
  const normLabel = (s: string) => s.replace(/[›»]/g, "").replace(/\s+/g, " ").trim();
  $(root, "#page a, #page button").forEach((el) => {
    if (el.hasAttribute("data-act") || el.hasAttribute("data-act-submit")) return;
    const label = normLabel(el.textContent || "");
    if (!label || label.length > 40) return;
    for (const [re, href] of NAV_MAP) {
      if (re.test(label)) {
        el.style.cursor = "pointer";
        bind(el, "click", (e) => {
          e.preventDefault();
          window.location.assign(href);
        });
        break;
      }
    }
  });

  /* ------------------------- Chiffres réels (API publique) ----------------- */
  const about = root.querySelector<HTMLElement>("#apropos");
  if (about && !root.querySelector("#abc-live-stats")) {
    const strip = document.createElement("div");
    strip.id = "abc-live-stats";
    strip.style.cssText = "grid-column:1/-1;display:flex;flex-wrap:wrap;gap:30px;margin-top:26px";
    strip.innerHTML = (
      [
        ["establishments", "établissements"],
        ["payments", "paiements traités"],
        ["volume", "volume encaissé"],
      ] as const
    )
      .map(
        ([k, lab]) =>
          `<div><div data-stat="${k}" style="font-family:var(--font-sora);font-weight:800;font-size:26px;line-height:1;color:var(--t-ink)">—</div>` +
          `<div style="font-size:12.5px;color:var(--t-muted);margin-top:5px">${lab}</div></div>`,
      )
      .join("");
    (about.querySelector("#grid-apropos") ?? about).appendChild(strip);
  }
  apiGetJson("/api/v1/stats/public")
    .then((j) => {
      const d = (j as { data?: Record<string, unknown> })?.data;
      if (!d) return;
      const nf = new Intl.NumberFormat("fr-FR");
      const setStat = (k: string, v: string) => {
        const el = root.querySelector<HTMLElement>(`[data-stat="${k}"]`);
        if (el) el.textContent = v;
      };
      if (typeof d.establishments === "number") setStat("establishments", nf.format(d.establishments));
      if (typeof d.payments === "number") setStat("payments", nf.format(d.payments));
      if (typeof d.volume === "number") {
        const sym = d.currency === "CDF" ? "FC" : "$";
        setStat("volume", `${nf.format(d.volume)} ${sym}`);
      }
    })
    .catch(() => {
      /* API indisponible : la landing reste statique */
    });

  /* ----------------------- Avis / témoignages (section 9) ------------------ */
  const quotesGrid = root.querySelector<HTMLElement>("#grid-quotes");
  if (quotesGrid) {
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
    apiGetJson("/api/v1/reviews/public")
      .then((j) => {
        const list = (j as { data?: Array<{ author_name: string; author_role: string | null; context: string | null; rating: number; message: string }> })?.data;
        if (!list || list.length === 0) return; // sinon on garde les témoignages du design
        quotesGrid.innerHTML = list
          .map((r) => {
            const n = Math.max(1, Math.min(5, r.rating));
            const stars = "★".repeat(n) + "☆".repeat(5 - n);
            const sub = [r.author_role, r.context].filter(Boolean).map((x) => esc(String(x))).join(" · ");
            return (
              `<div style="background:var(--s-page);border:1px solid var(--ln);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px">` +
              `<div style="color:#FCB326;font-size:14px;letter-spacing:1px">${stars}</div>` +
              `<p style="margin:0;font-size:14.5px;line-height:1.55;color:var(--t-ink)">« ${esc(r.message)} »</p>` +
              `<div><div style="font-size:12.5px;font-weight:700;color:var(--t-ink)">${esc(r.author_name)}</div>` +
              (sub ? `<div style="font-size:11.5px;color:var(--t-muted)">${sub}</div>` : "") +
              `</div></div>`
            );
          })
          .join("");
      })
      .catch(() => {
        /* pas d'avis approuvés : témoignages du design conservés */
      });
  }

  /* ----------------------- FAQ gérée (section Questions) ------------------- */
  // Les entrées publiées en admin REMPLACENT la FAQ statique du design (sinon on
  // conserve la FAQ bilingue d'origine). Rendu FR seul (comme les avis) : le contenu
  // dynamique n'a pas de traduction data-en.
  const faqCol = root.querySelector<HTMLElement>("#grid-faq > div:last-child");
  if (faqCol) {
    const escFaq = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
    apiGetJson("/api/v1/faqs/public")
      .then((j) => {
        const list = (j as { data?: Array<{ question: string; answer: string }> })?.data;
        if (!list || list.length === 0) return; // pas de FAQ gérée : on garde celle du design
        faqCol.innerHTML = list
          .map(
            (f) =>
              `<details style="background:var(--s-card);border:1px solid var(--ln);border-radius:16px;padding:18px 20px">` +
              `<summary style="display:flex;justify-content:space-between;gap:16px;align-items:center;font-family:Sora,sans-serif;font-weight:700;font-size:15.5px;color:var(--t-ink)">` +
              `<span>${escFaq(f.question)}</span>` +
              `<span aria-hidden="true" style="color:var(--t-brand);font-size:19px;line-height:1">+</span></summary>` +
              `<p style="font-size:14.5px;line-height:1.65;color:var(--t-muted);margin:12px 0 0">${escFaq(f.answer)}</p>` +
              `</details>`,
          )
          .join("");
        // Rebranche le marqueur +/- sur les <details> fraîchement injectés.
        faqCol.querySelectorAll("details").forEach((d) =>
          bind(d, "toggle", () => {
            const mark = d.querySelector<HTMLElement>("summary span[aria-hidden]");
            if (mark) mark.textContent = d.open ? "–" : "+";
          }),
        );
      })
      .catch(() => {
        /* API indisponible : FAQ du design conservée */
      });
  }

  /* ------------------------- Menu mobile + accordéons FAQ ------------------- */
  $(root, "#mobilemenu a").forEach((a) =>
    bind(a, "click", () => {
      const m = root.querySelector<HTMLElement>("#mobilemenu");
      if (m) m.style.display = "none";
    }),
  );

  $<HTMLDetailsElement>(root, "details").forEach((d) =>
    bind(d, "toggle", () => {
      const mark = d.querySelector<HTMLElement>("summary span[aria-hidden]");
      if (mark) mark.textContent = d.open ? "–" : "+";
    }),
  );

  /* --------------------------------- Nettoyage ----------------------------- */
  return () => {
    if (ioObs) ioObs.disconnect();
    if (stepTimer) clearInterval(stepTimer);
    if (chipTimer) clearInterval(chipTimer);
    if (resumeTimer) clearTimeout(resumeTimer);
    document.body.style.overflow = "";
    cleanups.forEach((fn) => fn());
  };
}
