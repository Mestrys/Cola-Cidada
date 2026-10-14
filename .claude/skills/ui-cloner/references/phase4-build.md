# Phase 4 — Build Prompt Generation (v2 — Animation-Aware)

## Overview

Convert the build spec into a single, self-contained prompt that any AI coding tool can execute to produce a working website. The prompt must be complete enough that someone with ZERO context about the reference site can build an accurate clone — **including all animations, scroll behaviors, and interactions.**

## Critical Rule: Match the Animation Library

**NEVER default to IntersectionObserver + CSS transitions if the reference site uses a more powerful animation system.**

| Reference Uses | Build Must Use | CDN to Include |
|---------------|---------------|----------------|
| CSS-only animations | CSS @keyframes + transitions + IntersectionObserver | None |
| AOS library | AOS library | `https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js` + CSS |
| GSAP (no ScrollTrigger) | GSAP core | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` |
| GSAP + ScrollTrigger | GSAP + ScrollTrigger plugin | gsap.min.js + ScrollTrigger.min.js |
| GSAP + SplitText | GSAP + SplitType (free alternative) | gsap.min.js + SplitType via CDN |
| Lottie | lottie-web | `https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js` |
| Lenis smooth scroll | Lenis | `https://unpkg.com/lenis@1.0.42/dist/lenis.min.js` |
| Locomotive Scroll | Locomotive or Lenis (simpler) | Choose based on complexity |
| Swiper | Swiper | `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js` + CSS |
| Three.js / WebGL | Warn user, simplify or include Three.js | Case-by-case |

## Prompt Structure

The generated prompt should follow this template. **The animation section is now expanded significantly.**

---

### PROMPT TEMPLATE START

```markdown
# Build Instruction: [Brand Name] Website

## Identity
You are building a landing page / website for **[Brand Name]** — [tagline].
[1-2 sentence product description].
Target audience: [audience].
Brand feeling: [adjectives]. The site should make visitors feel [emotion].

## Tech Stack
- [Primary: e.g., Single HTML file]
- [CSS: e.g., Tailwind CSS via CDN (https://cdn.tailwindcss.com)]
- [Fonts: e.g., Google Fonts — link tags for [Font1] and [Font2]]
- [Animation engine: GSAP 3.12 + ScrollTrigger — SEE CDN LINKS BELOW]
- [Smooth scroll: Lenis 1.0]
- [Icons: e.g., Lucide Icons via CDN, or inline SVGs]

### Required CDN Links (include ALL of these in <head>)
```html
<!-- Tailwind -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=[Font1]:wght@[weights]&family=[Font2]:wght@[weights]&display=swap" rel="stylesheet">

<!-- GSAP (if Tier 2+) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

<!-- Lenis Smooth Scroll (if detected) -->
<script src="https://unpkg.com/lenis@1.0.42/dist/lenis.min.js"></script>

<!-- Lottie (if detected) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

<!-- Swiper (if detected) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
```
[Include ONLY the CDNs that the reference site actually uses]

## Design System

### CSS Custom Properties
```css
:root {
  /* Colors */
  --color-primary: [hex];
  --color-secondary: [hex];
  --color-accent: [hex];
  --color-bg: [hex];
  --color-surface: [hex];
  --color-text: [hex];
  --color-text-muted: [hex];
  --color-border: [hex];

  /* Typography */
  --font-display: '[Font Name]', [fallback];
  --font-body: '[Font Name]', [fallback];
  --font-mono: '[Font Name]', monospace;

  /* Spacing */
  --space-xs: [val];
  --space-sm: [val];
  --space-md: [val];
  --space-lg: [val];
  --space-xl: [val];
  --space-2xl: [val];

  /* Effects */
  --radius-sm: [val];
  --radius-md: [val];
  --radius-lg: [val];
  --radius-full: 9999px;
  --shadow-sm: [val];
  --shadow-md: [val];
  --shadow-lg: [val];
  
  /* Animation tokens */
  --ease-default: cubic-bezier(0.16, 1, 0.3, 1);  /* from Site DNA */
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 300ms;
  --duration-normal: 600ms;
  --duration-slow: 1000ms;
}
```

### Typography Scale
[Same as v1]

### Container
[Same as v1]

## ========================================
## ANIMATION SYSTEM (CRITICAL SECTION)
## ========================================

### Animation Tier: [1-4]
This site is Animation Tier [N]. Build animations accordingly.

---

### IF TIER 1 (CSS-only):

Use IntersectionObserver + CSS transitions:

```javascript
// Initialize scroll observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      // Stagger children
      const children = entry.target.querySelectorAll('.stagger-child');
      children.forEach((child, i) => {
        child.style.transitionDelay = `${i * 100}ms`;
        child.classList.add('is-visible');
      });
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

```css
/* Base hidden state */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity [duration] [easing], transform [duration] [easing];
}
.animate-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

### IF TIER 2 (GSAP core):

```javascript
// Register plugins
gsap.registerPlugin(ScrollTrigger);

// Smooth scroll (if Lenis detected)
const lenis = new Lenis({
  duration: [extracted duration, e.g., 1.2],
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // or extracted easing
  smooth: true,
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
// Sync Lenis with ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Page load sequence
// [PASTE EXACT EXTRACTED TIMELINE FROM SITE DNA]
gsap.from("[hero heading selector]", {
  y: [extracted value], 
  opacity: 0, 
  duration: [extracted duration], 
  ease: "[extracted ease]", 
  delay: [extracted delay]
});
// ... continue for each element in the load sequence

// Scroll-triggered animations
// [FOR EACH SCROLL ANIMATION FROM SITE DNA]
gsap.from("[selector]", {
  scrollTrigger: {
    trigger: "[trigger selector]",
    start: "[extracted start, e.g., 'top 80%']",
    toggleActions: "[extracted, e.g., 'play none none none']",
  },
  y: [extracted], opacity: 0, duration: [extracted], 
  ease: "[extracted]", stagger: [extracted]
});
```

---

### IF TIER 3 (GSAP + ScrollTrigger advanced):

Include all Tier 2 code PLUS:

```javascript
// Pinned sections with scrub
// [FOR EACH PINNED SECTION FROM SITE DNA]
const [sectionName]Timeline = gsap.timeline({
  scrollTrigger: {
    trigger: "[extracted trigger]",
    start: "[extracted, e.g., 'top top']",
    end: "[extracted, e.g., '+=200%']",
    pin: true,
    scrub: [extracted, e.g., 1],
    snap: [extracted, if any],
  }
});

// Add animations to the pinned timeline
[sectionName]Timeline
  .from("[card1]", { opacity: 0, y: 50 }, 0)
  .from("[card2]", { opacity: 0, y: 50 }, 0.2)
  .from("[card3]", { opacity: 0, y: 50 }, 0.4)
  .to("[background]", { backgroundColor: "[color]" }, 0.6);

// Text splitting animations
// [If SplitType detected]
const splitTexts = document.querySelectorAll('[data-split]');
splitTexts.forEach(el => {
  const split = new SplitType(el, { types: 'words,chars' });
  gsap.from(split.chars, {
    scrollTrigger: { trigger: el, start: 'top 80%' },
    y: [extracted], opacity: 0, 
    duration: [extracted], stagger: [extracted], 
    ease: "[extracted]"
  });
});

// Parallax layers
// [FOR EACH PARALLAX ELEMENT FROM MOTION MAP]
gsap.to("[selector]", {
  scrollTrigger: {
    trigger: "[parent section]",
    start: "top bottom",
    end: "bottom top",
    scrub: true,
  },
  y: [extracted offset, e.g., -100],  // negative = moves up slower (background parallax)
});

// Horizontal scroll section (if detected)
// [If motion map shows horizontal movement]
const horizontalSections = gsap.utils.toArray('.horizontal-panel');
gsap.to(horizontalSections, {
  xPercent: -100 * (horizontalSections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".horizontal-container",
    pin: true,
    scrub: 1,
    end: () => "+=" + document.querySelector(".horizontal-container").offsetWidth,
  },
});
```

---

### IF TIER 4 (WebGL / Three.js):

**Warn the user**: "The reference site uses WebGL/Three.js effects that are extremely complex to replicate. I'll implement the core layout and standard animations faithfully, and provide a simplified CSS/canvas alternative for the WebGL effects. For a pixel-perfect WebGL match, you'd need a dedicated Three.js developer."

Then implement Tier 3 animations for everything non-WebGL, and add a CSS gradient/noise/animation fallback for the WebGL sections.

---

### Hover Interactions (ALL TIERS)

```css
/* [PASTE EXTRACTED :hover RULES FROM SITE DNA] */

/* Example — adapt to what was actually extracted: */
.card {
  transition: transform [extracted]ms [extracted-easing], 
              box-shadow [extracted]ms [extracted-easing];
}
.card:hover {
  transform: [extracted, e.g., scale(1.02) translateY(-4px)];
  box-shadow: [extracted, e.g., 0 20px 40px rgba(0,0,0,0.12)];
}

.btn-primary {
  transition: [extracted];
}
.btn-primary:hover {
  [extracted hover properties]
}

/* Nav links */
.nav-link {
  position: relative;
}
.nav-link::after {
  /* [extracted underline animation — width, height, color, transition] */
}
.nav-link:hover::after {
  /* [extracted] */
}
```

### @keyframes (ALL TIERS)

```css
/* [PASTE ALL EXTRACTED @keyframes FROM SITE DNA] */

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* [Paste every extracted @keyframes rule] */
```

### Continuous/Ambient Animations

```css
/* [Floating elements, rotating gradients, pulsing indicators, etc.] */
/* [Paste from Site DNA continuous animation section] */
```

## ========================================
## END ANIMATION SYSTEM
## ========================================

## Page Sections — Build These In Order

### Section 1: Navigation
[EXACT specification — same as v1 but with extracted hover CSS rules for nav links]

### Section 2: Hero
[EXACT specification — includes extracted page-load animation sequence code]

[Continue for EVERY section... Each section MUST include its specific animation code, not just "fade in on scroll"]

### Section N: Footer
[EXACT specification]

## Responsive Requirements
- **≥1280px**: Full desktop layout as specified above
- **1024-1279px**: [specific changes]
- **768-1023px**: [specific changes]
- **<768px**: [mobile layout — disable parallax, simplify scroll animations, hamburger nav]

### Responsive Animation Notes
- Disable parallax on mobile (scrub: false, pin: false for < 768px)
- Reduce stagger delays by 50% on mobile (faster perceived loading)
- Disable smooth scroll on touch devices OR use Lenis with `smoothTouch: false`
- Simplify or disable horizontal scroll sections on mobile

## Quality Checklist
Before considering this done, verify:
- [ ] All sections render correctly at desktop, tablet, and mobile widths
- [ ] **Page load animation sequence fires correctly** (elements animate in order with correct delays)
- [ ] **All scroll-triggered animations fire** (test by scrolling slowly through the entire page)
- [ ] **Pinned sections work** (if any — section stays fixed while scrolling through it)
- [ ] **Parallax effects work** (background elements move at different speeds)
- [ ] **Smooth scroll works** (if Lenis/Locomotive is specified — scroll should feel buttery)
- [ ] All hover effects work on buttons, cards, and links
- [ ] Navigation is responsive (hamburger on mobile)
- [ ] Typography is consistent with the design system
- [ ] Colors match the design system exactly
- [ ] No horizontal scrollbar at any viewport width
- [ ] All content is present (no placeholder text like "Lorem ipsum")
- [ ] **Animation easing curves feel right** (not linear or default ease — use the specified cubic-bezier)
- [ ] **Stagger timing feels natural** (items animate in sequence, not simultaneously)
- [ ] GSAP ScrollTrigger.refresh() is called after all content loads (if using GSAP)
- [ ] Lenis is properly synced with ScrollTrigger (if using both)

## Do NOT:
- Use placeholder text like "Lorem ipsum"
- Use generic stock photo URLs
- Skip animations — they define the experience
- Use default Tailwind colors — use CSS custom properties
- Use IntersectionObserver if GSAP ScrollTrigger is specified (they conflict)
- Add a cookie banner or popup unless specified
- Use linear easing unless the site DNA specifically says linear
- Forget to call ScrollTrigger.refresh() after DOM is ready
```

### PROMPT TEMPLATE END

---

## Writing Guidelines

1. **Be absurdly specific.** "A nice hero section" → bad. "A full-viewport hero with a 64px heading in Syne Bold, #0a0a0a background, with a GSAP tween: `gsap.from('.hero-heading', { y:40, opacity:0, duration:0.8, ease:'power3.out', delay:0.3})`" → good.

2. **Include exact text.** Every heading, every button label, every feature description.

3. **Paste extracted animation code.** Don't describe "a scroll animation." Paste the GSAP timeline or CSS @keyframes that was extracted in Phase 1. The builder should be able to copy-paste animation code, not interpret vague descriptions.

4. **Give HTML structure hints.** Not full HTML — just the nesting pattern.

5. **No emojis in the prompt.**

6. **Include ALL CDN links as actual HTML tags.** Don't just say "use GSAP" — include the exact `<script>` tags.

7. **Include the Lenis + ScrollTrigger sync code.** This is the #1 source of "smooth scroll broke my animations" bugs. Always include the sync boilerplate if both are used.

## After Writing the Prompt

Save to `./ui-clone-workspace/build-prompt.md`.

Then ask the user what they want to do:
- **Execute now**: Build the site yourself using the prompt as instructions.
- **Copy for external use**: Just provide the prompt file.
- **Review first**: Let them read and edit before proceeding.

### If Executing the Build

1. Create `./ui-clone-workspace/output/` directory
2. Follow the build prompt exactly as written
3. For default stack (single HTML): create `./ui-clone-workspace/output/index.html`
4. **Test scroll behavior**: After building, scroll through the entire page in Chrome to verify all scroll-triggered animations fire
5. Ask if they want to run the iterator (Phase 5)
