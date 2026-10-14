# Phase 1 — Site DNA Extraction Protocol (v2 — Deep Animation Capture)

## Overview

This phase uses Chrome (via `claude --chrome`) to perform a forensic audit of the target website. The goal is to extract every visual, structural, AND behavioral detail so it can be replicated — including all animation code, scroll behaviors, and interaction states.

## Step-by-Step Extraction

### 1. Setup

```bash
mkdir -p ./ui-clone-workspace/screenshots
```

### 2. Navigate and Wait

- Navigate to the target URL
- Wait for the page to fully load:
  - Wait for network idle (no pending requests for 500ms)
  - Wait an additional 2 seconds for JS-driven animations to initialize
  - If the page has a loading screen/animation, wait for it to complete

### 3. Animation Tier Classification

**Do this FIRST, before deep extraction.** Run this in the browser console:

```javascript
const tier = {
  hasGSAP: !!window.gsap,
  hasScrollTrigger: !!window.ScrollTrigger,
  hasLottie: !!window.lottie || !!document.querySelector('lottie-player'),
  hasThreeJS: !!window.THREE,
  hasFramerMotion: !!document.querySelector('[data-framer-appear-id]'),
  hasBarba: !!window.barba,
  hasLenis: !!window.Lenis || !!window.__lenis,
  hasLocomotive: !!window.LocomotiveScroll,
  hasSplitText: !!window.SplitText || !!window.SplitType,
  hasSwiper: !!window.Swiper,
  hasAOS: !!window.AOS,
  cssAnimationCount: [...document.styleSheets].reduce((count, sheet) => {
    try { 
      return count + [...sheet.cssRules].filter(r => r instanceof CSSKeyframesRule).length;
    } catch(e) { return count; }
  }, 0),
  scrollTriggeredElements: document.querySelectorAll('[data-aos], [data-scroll], [data-gsap], .animate-on-scroll, .scroll-animate, [data-animate]').length,
};

// Classify
let animationTier = 1;
if (tier.hasGSAP && tier.hasScrollTrigger) animationTier = Math.max(animationTier, 3);
else if (tier.hasGSAP) animationTier = Math.max(animationTier, 2);
if (tier.hasLottie) animationTier = Math.max(animationTier, 3);
if (tier.hasThreeJS) animationTier = 4;
if (tier.hasLenis || tier.hasLocomotive) animationTier = Math.max(animationTier, 2);
if (tier.hasSplitText) animationTier = Math.max(animationTier, 2);
if (tier.cssAnimationCount > 5) animationTier = Math.max(animationTier, 2);

console.log('Animation Tier:', animationTier, tier);
```

**Record the tier in the Site DNA document.** This determines the build approach in Phase 4:
- **Tier 1** (Simple): CSS transitions + IntersectionObserver
- **Tier 2** (Intermediate): GSAP core + Lenis/smooth scroll
- **Tier 3** (Complex): GSAP + ScrollTrigger + Lottie + text splitting
- **Tier 4** (Extreme): Three.js / WebGL / custom shaders — warn user about limitations

### 4. Viewport and Page Dimensions

- Record the viewport size (default: 1440×900 for desktop)
- Get the full page height via `document.body.scrollHeight` or `document.documentElement.scrollHeight`
- Calculate number of scroll positions needed: `Math.ceil(pageHeight / viewportHeight)`

### 5. Scroll-and-Screenshot Loop (Enhanced)

For each scroll position (starting at top):

1. **Record pre-scroll state**: For all key elements, capture `getBoundingClientRect()`, `opacity`, `transform` via computed style
2. Scroll to position: `window.scrollTo(0, position)`
3. Wait 800ms for scroll-triggered animations to fire
4. **Record post-scroll state**: Same elements, capture rect + styles again
5. Take a screenshot → save as `screenshots/reference-{NN}.png`
6. **Log state changes**: Any element whose opacity, transform, position, or clip-path changed between pre-scroll and post-scroll is a scroll-animated element. Record:
   - Which element (CSS selector)
   - What changed (opacity 0→1, translateY 40px→0, etc.)
   - At what scroll position it triggered

**Critical**: This scroll behavior log is the motion map. It captures WHAT ANIMATES and WHEN, which screenshots alone cannot.

### 6. DOM Extraction

Extract the full rendered DOM. Focus on:

```
- document.documentElement.outerHTML (full HTML)
- All <link> and <style> tags (stylesheets)
- All <script> tags (identify animation/UI libraries)
```

Identify loaded libraries by checking:
- `window.gsap` or scripts containing "gsap" → GSAP animations
- `window.ScrollTrigger` → GSAP ScrollTrigger plugin
- `window.Lottie` or lottie scripts → Lottie animations
- Scripts containing "framer-motion" → Framer Motion
- Scripts containing "aos" → AOS (Animate On Scroll)
- Scripts containing "swiper" → Swiper.js sliders
- Scripts containing "locomotive" or "lenis" → Smooth scroll libraries
- Scripts containing "three" or "webgl" → 3D/WebGL effects
- Scripts containing "splitting" or "splittype" or "SplitText" → Text splitting
- `window.SplitType` or `window.SplitText` → Text character/word animation
- Scripts containing "barba" → Page transition library
- Any `IntersectionObserver` usage → Scroll-triggered behavior

### 7. CSS Animation Extraction (NEW — CRITICAL)

Execute this in the browser to extract ALL animation-related CSS:

```javascript
// === STEP 7a: Extract all @keyframes ===
const allKeyframes = [];
for (const sheet of document.styleSheets) {
  try {
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSKeyframesRule) {
        allKeyframes.push({
          name: rule.name,
          cssText: rule.cssText
        });
      }
    }
  } catch(e) { /* cross-origin sheets — skip */ }
}

// === STEP 7b: Extract animation/transition properties from ALL elements ===
function getUniqueSelector(el) {
  if (el.id) return '#' + el.id;
  let path = [];
  while (el && el.nodeType === 1) {
    let selector = el.tagName.toLowerCase();
    if (el.id) { path.unshift('#' + el.id); break; }
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => 
        !c.match(/^(is-|has-|js-|active|visible|loaded|animated)/) // skip state classes
      ).slice(0, 3);
      if (classes.length) selector += '.' + classes.join('.');
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(s => s.tagName === el.tagName);
      if (siblings.length > 1) {
        selector += ':nth-child(' + ([...parent.children].indexOf(el) + 1) + ')';
      }
    }
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

const animatedElements = [];
document.querySelectorAll('*').forEach(el => {
  const cs = getComputedStyle(el);
  
  const hasAnimation = cs.animationName && cs.animationName !== 'none';
  const hasTransition = cs.transitionProperty !== 'all' && 
                        cs.transitionProperty !== 'none' &&
                        cs.transitionDuration !== '0s';
  const hasTransform = cs.transform && cs.transform !== 'none';
  const hasClipPath = cs.clipPath && cs.clipPath !== 'none';
  const hasWillChange = cs.willChange && cs.willChange !== 'auto';
  const hasFilter = cs.filter && cs.filter !== 'none';
  const lowOpacity = parseFloat(cs.opacity) < 1;
  
  if (hasAnimation || hasTransition || hasTransform || hasClipPath || hasWillChange) {
    animatedElements.push({
      selector: getUniqueSelector(el),
      tag: el.tagName,
      classes: [...el.classList].join(' '),
      // Animation properties
      animation: hasAnimation ? {
        name: cs.animationName,
        duration: cs.animationDuration,
        timingFunction: cs.animationTimingFunction,
        delay: cs.animationDelay,
        iterationCount: cs.animationIterationCount,
        direction: cs.animationDirection,
        fillMode: cs.animationFillMode,
        playState: cs.animationPlayState,
      } : null,
      // Transition properties
      transition: hasTransition ? {
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timingFunction: cs.transitionTimingFunction,
        delay: cs.transitionDelay,
      } : null,
      // Transform
      transform: hasTransform ? cs.transform : null,
      transformOrigin: cs.transformOrigin !== '50% 50%' ? cs.transformOrigin : null,
      // Clip path
      clipPath: hasClipPath ? cs.clipPath : null,
      // Opacity
      opacity: lowOpacity ? cs.opacity : null,
      // Will change hints
      willChange: hasWillChange ? cs.willChange : null,
      // Perspective (for 3D)
      perspective: cs.perspective !== 'none' ? cs.perspective : null,
      // Filter
      filter: hasFilter ? cs.filter : null,
    });
  }
});

console.log('Keyframes:', JSON.stringify(allKeyframes, null, 2));
console.log('Animated elements:', JSON.stringify(animatedElements, null, 2));
```

### 8. GSAP/ScrollTrigger Deep Extraction (NEW — if GSAP detected)

```javascript
if (window.gsap) {
  const gsapData = {
    version: gsap.version,
    // All registered plugins
    plugins: Object.keys(gsap.plugins || {}),
  };

  // Extract ScrollTrigger instances
  if (window.ScrollTrigger) {
    gsapData.scrollTriggers = ScrollTrigger.getAll().map(st => {
      const data = {
        trigger: st.trigger ? getUniqueSelector(st.trigger) : null,
        start: st.vars.start,
        end: st.vars.end,
        pin: !!st.vars.pin,
        pinSpacing: st.vars.pinSpacing,
        scrub: st.vars.scrub,
        snap: st.vars.snap,
        toggleClass: st.vars.toggleClass,
        toggleActions: st.vars.toggleActions,
      };
      
      // Try to extract the associated animation
      if (st.animation) {
        try {
          const targets = st.animation.targets?.();
          data.animation = {
            targets: targets ? targets.map(t => t.nodeType ? getUniqueSelector(t) : String(t)) : [],
            duration: st.animation.duration(),
            vars: JSON.parse(JSON.stringify(st.animation.vars || {})),
          };
        } catch(e) {
          data.animation = { error: 'Could not serialize' };
        }
      }
      return data;
    });
  }

  // Extract active tweens from global timeline
  try {
    const children = gsap.globalTimeline.getChildren(true, true, true);
    gsapData.tweenCount = children.length;
    gsapData.sampleTweens = children.slice(0, 20).map(t => {
      try {
        return {
          targets: t.targets?.()?.map(el => el.nodeType ? getUniqueSelector(el) : String(el)),
          duration: t.duration(),
          delay: t.delay(),
          ease: t.vars?.ease,
          vars: Object.keys(t.vars || {}).filter(k => 
            !['onComplete','onStart','onUpdate','callbackScope','id','lazy'].includes(k)
          ),
        };
      } catch(e) { return { error: 'Could not serialize' }; }
    });
  } catch(e) {}

  console.log('GSAP Data:', JSON.stringify(gsapData, null, 2));
}
```

### 9. Smooth Scroll Library Extraction (NEW — if Lenis/Locomotive detected)

```javascript
// Lenis
if (window.Lenis || window.__lenis) {
  const lenis = window.__lenis || document.querySelector('[data-lenis]')?.__lenis;
  if (lenis) {
    console.log('Lenis config:', JSON.stringify({
      duration: lenis.options?.duration,
      easing: lenis.options?.easing?.toString(),
      smooth: lenis.options?.smooth,
      smoothTouch: lenis.options?.smoothTouch,
      direction: lenis.options?.direction,
    }));
  }
}
```

### 10. Hover State Extraction (NEW)

For every interactive element (buttons, links, cards), capture the hover state:

```javascript
// Identify interactive elements
const interactiveEls = document.querySelectorAll('a, button, [role="button"], .card, [class*="card"], [class*="btn"]');

const hoverStates = [];
for (const el of interactiveEls) {
  // Capture base state
  const baseStyles = {
    transform: getComputedStyle(el).transform,
    boxShadow: getComputedStyle(el).boxShadow,
    backgroundColor: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    borderColor: getComputedStyle(el).borderColor,
    opacity: getComputedStyle(el).opacity,
    scale: getComputedStyle(el).scale,
  };
  
  // Simulate hover via :hover pseudo-class check isn't possible programmatically,
  // but we can check for transition properties which indicate hover animation exists
  const cs = getComputedStyle(el);
  if (cs.transitionProperty !== 'none' && cs.transitionProperty !== 'all' || 
      cs.transitionDuration !== '0s') {
    hoverStates.push({
      selector: getUniqueSelector(el),
      text: el.textContent?.trim().slice(0, 50),
      transition: {
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timing: cs.transitionTimingFunction,
        delay: cs.transitionDelay,
      },
      baseStyles,
      // Also extract :hover rules from stylesheets
    });
  }
}

// Extract :hover rules from stylesheets
const hoverRules = [];
for (const sheet of document.styleSheets) {
  try {
    for (const rule of sheet.cssRules) {
      if (rule.selectorText && rule.selectorText.includes(':hover')) {
        hoverRules.push({
          selector: rule.selectorText,
          cssText: rule.cssText
        });
      }
    }
  } catch(e) {}
}

console.log('Hover states:', JSON.stringify(hoverStates, null, 2));
console.log('Hover CSS rules:', JSON.stringify(hoverRules, null, 2));
```

### 11. Design Token Extraction

(Same as original Phase 1 Step 6 — colors, typography, spacing, visual effects)

### 12. Component/Section Mapping

(Same as original Phase 1 Step 7, but with ENHANCED animation fields)

For EACH section, record:

```markdown
### Section N: [Name] (e.g., "Hero", "Features Grid", "Testimonials")

**Viewport position**: Screenshots reference-03 to reference-04
**HTML structure**: [e.g., "section > div.container > div.grid.grid-cols-3 > div.card × 6"]
**Layout**: [flex-row | grid-3col | absolute-positioned | sticky | etc.]
**Background**: [color/gradient/image/video/pattern]
**Content elements**:
  - Heading: [text, font-size, font-weight, color, max-width]
  - Subheading: [text, styles]
  - Body text: [text, styles]
  - CTA buttons: [text, styles, hover styles]
  - Images/media: [dimensions, object-fit, border-radius]
  - Icons: [library (Lucide/Heroicons/custom SVG), size, color]

**Animations (DETAILED)**:
  - **Entry type**: [CSS transition triggered by class | GSAP tween | GSAP ScrollTrigger | CSS @keyframes | Lottie]
  - **Entry from-state**: [opacity:0, y:40px, clipPath: inset(100% 0 0 0)] — EXACT values
  - **Entry to-state**: [opacity:1, y:0, clipPath: inset(0)] — EXACT values
  - **Duration**: [exact ms]
  - **Easing**: [exact cubic-bezier or GSAP ease name like "power3.out"]
  - **Delay**: [exact ms, or stagger value]
  - **Trigger**: [page load | scroll into view at N% | scroll position | parent animation complete]
  - **Scroll behavior**: [none | parallax (speed ratio) | pin (start/end positions) | scrub (scrub value)]
  - **Extracted code**: [if GSAP, paste the actual tween/timeline code. If CSS, paste the @keyframes + animation property]
  
  - **Hover effects**: 
    - Property changes: [transform: scale(1.03), boxShadow: 0 20px 40px rgba(0,0,0,0.15)]
    - Transition: [duration, easing]
    - Extracted CSS rule: [paste the :hover rule]

  - **Micro-interactions**: [button press scale, card tilt, icon spin, input focus glow, etc.]
  - **Continuous animations**: [floating elements, rotating gradients, pulsing dots, blinking cursors]

**Responsive hints**: [any visible responsive classes or media query behavior]
```

### 13. Navigation Analysis

(Same as original)

### 14. Footer Analysis

(Same as original)

### 15. Write the Site DNA Document

Compile everything into `./ui-clone-workspace/site-dna.md` with this structure:

```markdown
# Site DNA: [Site Name]
**Source URL**: [url]
**Crawled**: [date/time]
**Screenshots**: [N] viewport captures in ./screenshots/
**Animation Tier**: [1-4] — [Simple/Intermediate/Complex/Extreme]

## 1. Identity & Vibe
[2-3 sentence summary of the site's personality, target audience feel, overall impression]

## 2. Design System Tokens

### Colors
[Full palette with hex values, organized by role]

### Typography
[Font families, size scale, weight scale, line heights]

### Spacing
[Spacing scale, container max-width, section padding]

### Visual Effects
[Border radii, shadows, blurs, gradients]

## 3. Animation System (DETAILED)

### Libraries Detected
| Library | Version | CDN URL | Purpose |
|---------|---------|---------|---------|
| GSAP | 3.12.5 | [url] | Core animation engine |
| ScrollTrigger | 3.12.5 | [url] | Scroll-linked animations |
| Lenis | 1.0.42 | [url] | Smooth scrolling |
| SplitType | 0.3.4 | [url] | Text character splitting |

### Global Animation Defaults
- Default easing: [exact value, e.g., cubic-bezier(0.16, 1, 0.3, 1) or "power3.out"]
- Default duration: [ms]
- Scroll trigger threshold: [when elements trigger — e.g., 20% visible]
- Stagger default: [ms between items]
- Smooth scroll: [Lenis/Locomotive config — duration, easing]

### Extracted @keyframes
[Paste ALL @keyframes rules found in Step 7a]

### Extracted ScrollTrigger Configurations
[Paste ALL ScrollTrigger instances from Step 8 — trigger, start, end, pin, scrub, animation details]

### Scroll Motion Map
[From Step 5 — which elements move/change during scroll, at what positions, by how much]
| Scroll Position | Element | Property Changed | From | To | Behavior |
|-----------------|---------|-----------------|------|-----|----------|
| 0-500px | .hero-bg | translateY | 0 | -100px | Parallax (0.2x) |
| 800px | .features | position | relative | fixed | Pin start |
| 800-2400px | .feature-card:nth(1) | opacity | 0 | 1 | Scrub |
| ... | ... | ... | ... | ... | ... |

### Extracted Hover Rules
[Paste ALL :hover CSS rules from Step 10]

## 4. Page Structure — Section by Section
[Each section documented per the ENHANCED template in Step 12]

## 5. Navigation
[Full nav documentation]

## 6. Footer
[Full footer documentation]

## 7. Technical Notes
[Libraries loaded with CDN URLs, performance observations, any quirks]
```

### Timing Expectation

Phase 1 typically takes 5-12 minutes depending on animation complexity. **Do not rush it — the animation extraction is the difference between a $500 clone and a $5,000 clone.**
