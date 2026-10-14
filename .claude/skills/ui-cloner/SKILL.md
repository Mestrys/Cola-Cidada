---
name: ui-cloner
description: Clone any website's design and adapt it to your brand. Use this skill when the user wants to clone a website, replicate a site's design, build a site inspired by another site, reverse-engineer a web design, or create a pixel-perfect copy of a reference site adapted to their own brand/product. Requires Chrome access (claude --chrome). Triggers on phrases like "clone this site", "build something like this website", "copy this design", "replicate this layout", "I want my site to look like X", or any URL followed by a request to build something similar.
---

# UI Cloner — Website Clone & Adapt System (v2)

Clone award-winning websites and adapt them to your brand in 5 phases. v2 adds deep animation extraction and library-matched builds for faithful reproduction of complex scroll animations, GSAP timelines, parallax effects, and micro-interactions.

## Prerequisites

- **Chrome access is required.** The user must run `claude --chrome` or have browser control enabled.
- This skill creates all working files in a `./ui-clone-workspace/` directory.

## Quick Start

When the user provides a URL (or says "clone [URL]"), immediately begin Phase 1. If they haven't provided a URL yet, ask for one.

**Command format the user will typically use:**
```
Clone this site: https://example.com
```

## Animation Complexity Tiers

During Phase 1, classify the reference site into one of these tiers. This determines the build approach for Phase 4.

| Tier | Name | What It Means | Build Approach |
|------|------|---------------|----------------|
| 1 | Simple | CSS transitions, basic fade-in on scroll, hover color/scale changes | Vanilla JS IntersectionObserver + CSS transitions |
| 2 | Intermediate | GSAP core tweens, staggered animations, Lenis smooth scroll, text splitting, parallax backgrounds | GSAP + Lenis CDNs, GSAP tweens with ScrollTrigger basic |
| 3 | Complex | GSAP ScrollTrigger pinning, scrub animations, horizontal scroll, Lottie, SVG path drawing, clip-path reveals | Full GSAP suite + Lottie/SplitType as needed |
| 4 | Extreme | Three.js, WebGL, shader effects, physics simulations, custom canvas | Warn user. Implement Tier 3 for standard elements, provide CSS fallbacks for WebGL |

**The tier determines which CDN libraries to include and what animation code pattern to use in the build prompt. NEVER use a lower-tier approach for a higher-tier site.**

## Workflow Overview

| Phase | Name | What happens | Output file |
|-------|------|-------------|-------------|
| 1 | Site DNA Extraction | Chrome crawls the reference site, screenshots every scroll-viewport, **extracts CSS @keyframes, GSAP configs, scroll behavior map, hover rules** | `site-dna.md` |
| 2 | Brand Interview | Ask the user 8-10 targeted questions about their project | `brand-interview.md` |
| 3 | Merge & Map | Combine Site DNA + Brand Interview into a section-by-section build specification with **concrete animation code** | `build-spec.md` |
| 4 | Build Prompt Generation | Convert the build spec into a prompt that includes **library-matched animation code, CDN links, and exact easing/timing values** | `build-prompt.md` |
| 5 | Iterator | Compare reference vs implementation **visually AND behaviorally** (scroll behavior, hover states, animation timing) | `iteration-N.md` |

---

## Phase 1 — Site DNA Extraction

**Read `references/phase1-site-dna.md` for the full extraction protocol.**

High-level steps:
1. Create `./ui-clone-workspace/` and `./ui-clone-workspace/screenshots/` directories
2. Navigate to the target URL in Chrome
3. Wait for full page load (wait for network idle)
4. **Classify animation tier** (check for GSAP, ScrollTrigger, Lottie, Three.js, Lenis, etc.)
5. Extract the full page metadata: title, meta description, favicon
6. **Enhanced scroll-and-screenshot loop**: scroll in viewport-sized increments, at each position:
   - Record element positions/opacity/transforms BEFORE scrolling
   - Scroll and wait for animations
   - Record element positions/opacity/transforms AFTER scrolling
   - Take screenshot
   - Log which elements changed state (this is the scroll motion map)
7. Extract the full DOM HTML
8. **Extract ALL @keyframes rules** from stylesheets
9. **Extract animation/transition CSS properties** from all animated elements (opacity, transform, clip-path, transition, animation, will-change)
10. **If GSAP detected**: Extract ScrollTrigger instances (trigger, start, end, pin, scrub, snap, animation vars)
11. **If GSAP detected**: Extract active tweens from global timeline (targets, duration, ease, vars)
12. **If Lenis/Locomotive detected**: Extract smooth scroll config (duration, easing)
13. **Extract all :hover CSS rules** from stylesheets
14. **Record hover transition properties** from interactive elements (buttons, cards, links)
15. Identify: color palette, typography, spacing system, border radii, shadows
16. Map every visible section/component with ENHANCED animation fields (entry from-state, to-state, duration, easing, trigger, extracted code)
17. Document navigation and footer
18. Write everything to `./ui-clone-workspace/site-dna.md`

**Critical**: The animation extraction (steps 8-14) is what makes v2 different. Without it, you're guessing at animations instead of replicating them. This is the difference between an 80% clone and a 95% clone.

After Phase 1 completes, **immediately proceed to Phase 2**.

---

## Phase 2 — Brand Interview

**Read `references/phase2-interview.md` for the full question set.**

(Same as v1 — no changes needed)

After collecting answers, write to `./ui-clone-workspace/brand-interview.md` and **immediately proceed to Phase 3**.

---

## Phase 3 — Merge & Map

**Read `references/phase3-merge.md` for the full merge protocol.**

Key v2 change: The animation specification must include **concrete code**, not vague descriptions.

For each section's animation, include:
- The animation library to use (matching what was detected in Phase 1)
- The EXACT code — GSAP timeline, CSS @keyframes, or IntersectionObserver setup
- The EXACT easing curve (cubic-bezier values or GSAP ease name)
- The EXACT duration, delay, and stagger values

**Wrong** (v1 style):
```
Animations: fade-up on scroll, 600ms, ease-out
```

**Right** (v2 style):
```
Animations:
  Library: GSAP + ScrollTrigger
  Code:
    gsap.from('.feature-card', {
      scrollTrigger: { trigger: '.features', start: 'top 80%' },
      y: 40, opacity: 0, duration: 0.6,
      ease: 'power2.out', stagger: 0.15
    });
```

Write to `./ui-clone-workspace/build-spec.md` and proceed to Phase 4.

---

## Phase 4 — Build Prompt Generation

**Read `references/phase4-build.md` for the prompt template.**

Key v2 changes:
1. **Library matching**: If reference uses GSAP, build with GSAP. If CSS-only, build with CSS. Never downgrade.
2. **Include CDN links as actual HTML**: Not "use GSAP" but the exact `<script>` tag
3. **Include Lenis + ScrollTrigger sync boilerplate** if both are used (this is the #1 bug source)
4. **Paste extracted animation code** into each section's specification
5. **Include all extracted @keyframes** in the CSS section
6. **Include all extracted :hover rules** in the CSS section
7. **Add animation-specific quality checklist items**: page load sequence, scroll triggers, pinning, parallax, hover states, easing feel

After building, **test scroll behavior** by scrolling through the entire page in Chrome before showing the user.

---

## Phase 5 — Iterator (Post-Build Refinement)

**Read `references/phase5-iterator.md` for the iteration protocol.**

Key v2 additions:

### Behavioral Comparison (NEW)
After visual screenshot comparison, also compare:

1. **Scroll behavior**: Run scroll recording script on both reference and build. Compare which elements animate, when they trigger, pin behavior, parallax speeds
2. **Hover states**: Programmatically hover over interactive elements on both sites. Compare what changes (transform, shadow, color)
3. **Page load animation**: Hard-reload both sites. Compare the entry animation sequence
4. **Smooth scroll feel**: Does the build's scroll feel as smooth as the reference? (Lenis/Locomotive config)

### Animation-Specific Fix Patterns (NEW)
- Animations not firing → Check GSAP loaded, ScrollTrigger registered, Lenis synced
- Pinned section scrolls through → Check parent overflow:hidden, call ScrollTrigger.refresh()
- Wrong parallax speed → Adjust y value in scrub tween
- Stagger not working → Verify multiple targets exist
- Easing feels wrong → Consult GSAP ease reference, match to site DNA

---

## File Structure

(Same as v1)

## Important Notes

- **Never skip the animation extraction in Phase 1.** This is the entire point of v2. Without it, you're building animations from guesswork.
- **Match the animation library.** If the reference uses GSAP, the build MUST use GSAP. IntersectionObserver cannot replicate ScrollTrigger pinning, scrubbing, or timelines.
- **Always include the Lenis + ScrollTrigger sync code** if both are present. Omitting this causes 90% of "my animations broke" issues.
- **Test by scrolling.** After every build and every iteration, slowly scroll through the entire page in Chrome. This catches animation issues that screenshots miss.
- **Default tech stack**: Single `index.html` with Tailwind CSS via CDN, the animation libraries detected in Phase 1, Google Fonts.
- **The build prompt must be self-contained.** Include ALL CDN links, ALL animation code, ALL CSS rules. Someone with zero context should be able to paste it and get a working, animated site.
