# Phase 5 — Iterator Protocol (v2 — Behavioral Comparison)

## Overview

The iterator compares the reference site against the built implementation, identifies discrepancies — **both visual AND behavioral** — and fixes them. v2 adds animation/interaction comparison that v1 was missing entirely.

## When to Run

(Same triggers as v1)

## Iteration Process

### Step 1: Screenshot the Reference Site

(Same as v1 — reuse Phase 1 screenshots if available)

### Step 2: Screenshot the Current Build

(Same as v1)

### Step 3: Visual Comparison (Same as v1)

For each pair of screenshots (reference vs build), analyze layout, color, typography, content discrepancies.

### Step 3b: Animation Behavior Comparison (NEW — CRITICAL)

This is what v1 was missing entirely. Screenshots can't capture motion.

#### 3b-1: Scroll Behavior Comparison

Run the scroll behavior recording script on BOTH sites:

```javascript
// Run this on reference AND on build
async function recordScrollBehavior() {
  const elements = document.querySelectorAll('section, [class*="hero"], [class*="feature"], [class*="card"], nav, footer, h1, h2, h3');
  const log = [];
  
  // Record state at each scroll position
  for (let scrollY = 0; scrollY < document.body.scrollHeight; scrollY += 100) {
    window.scrollTo(0, scrollY);
    await new Promise(r => setTimeout(r, 100)); // Let animations settle
    
    const snapshot = {};
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      snapshot[getUniqueSelector(el)] = {
        top: rect.top,
        opacity: parseFloat(cs.opacity),
        transform: cs.transform,
        position: cs.position,
        clipPath: cs.clipPath,
      };
    });
    log.push({ scrollY, snapshot });
  }
  return log;
}
```

Then compare the two logs:

**Check for each element:**
1. **Does it animate at all?** If reference shows opacity changing from 0→1 at scrollY=800 but build shows opacity always at 1 → animation is missing
2. **Does it pin?** If reference shows an element's `top` staying at 0 for scrollY 800-2000 but build shows it scrolling normally → pin is missing
3. **Is parallax speed right?** Calculate `element_movement / scroll_distance` for both. If reference ratio is 0.5 but build is 1.0 → parallax not implemented
4. **Does it trigger at the right position?** If reference element fades in at scrollY=600 but build fades in at scrollY=200 → trigger threshold is wrong

#### 3b-2: Hover Behavior Comparison

For each interactive element:

```javascript
// Programmatically dispatch hover events and compare
async function compareHover(el) {
  const before = captureStyles(el); // transform, shadow, bg, color, etc.
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500)); // Wait for transition
  const after = captureStyles(el);
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  return { before, after, changed: diff(before, after) };
}
```

Run on both reference and build. Compare:
- Does the element change on hover at all?
- Do the same properties change?
- Is the magnitude similar? (e.g., scale(1.02) vs scale(1.05))

#### 3b-3: Page Load Animation Check

1. Hard-reload the build page
2. Observe the first 3 seconds: do elements animate in with a sequence?
3. Compare against the reference's page load sequence documented in Site DNA
4. Common issues:
   - All elements appear instantly (no load animation)
   - Elements animate but simultaneously (missing stagger/delays)
   - Wrong easing (feels mechanical vs. smooth)

### Step 4: Prioritize Fixes (Enhanced)

Rank issues by impact:

**P0 — Critical** (completely breaks the feel):
- Missing sections or major elements
- Completely wrong colors or fonts
- Broken layout
- **No animations at all** (nothing animates on scroll)
- **GSAP/ScrollTrigger not loading** (check console for errors)
- **Smooth scroll not working** (page scrolls normally instead of smooth)

**P1 — Important** (noticeable difference):
- Spacing/sizing mismatches
- **Pinned sections not pinning** (scroll right through)
- **Parallax not working** (all layers move at same speed)
- **Scroll animations trigger at wrong position** (too early/too late)
- **Hover effects missing or wrong**
- **Stagger animation not staggering** (all items animate simultaneously)
- Responsive behavior broken

**P2 — Polish** (subtle but professional):
- **Easing curve doesn't feel right** (too snappy, too slow, too bouncy)
- **Animation duration off** (too fast or too slow)
- **Stagger delay off** (items animate too close together or too far apart)
- Gradient angle/stop adjustments
- Border radius fine-tuning
- Shadow depth/spread adjustments
- Letter-spacing and line-height refinements
- **Smooth scroll speed/momentum doesn't match** (Lenis duration parameter)

### Step 5: Apply Fixes (Enhanced)

Fix issues in priority order. Common animation fixes:

#### Fix: Animations Not Firing At All
```javascript
// Check 1: Is GSAP loaded?
console.log('GSAP:', typeof gsap); // Should not be undefined

// Check 2: Is ScrollTrigger registered?
console.log('ST:', typeof ScrollTrigger); // Should not be undefined

// Check 3: Are animations defined AFTER DOM is ready?
// WRONG: <script> in <head> runs before DOM exists
// RIGHT: <script> at end of <body> or DOMContentLoaded

// Check 4: If using Lenis, is it synced with ScrollTrigger?
// This is the #1 bug — Lenis handles scroll events, ScrollTrigger doesn't see them
// FIX:
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

#### Fix: Pinned Section Not Pinning
```javascript
// Check 1: Does the trigger element exist?
console.log(document.querySelector('.features-section')); // Should not be null

// Check 2: Is the pin section's parent overflow:hidden?
// FIX: Remove overflow:hidden from parent containers

// Check 3: Call ScrollTrigger.refresh() after all images/fonts load
window.addEventListener('load', () => ScrollTrigger.refresh());
```

#### Fix: Parallax Speed Wrong
```javascript
// Adjust the y value in the scrub tween
// Lower y = less parallax movement
// Higher y = more parallax movement
gsap.to('.bg-layer', {
  y: -150, // Adjust this number to match reference
  scrollTrigger: { scrub: true }
});
```

#### Fix: Stagger Not Working
```javascript
// Check: Are targets an array/NodeList, not a single element?
// WRONG: gsap.from('.card', { stagger: 0.1 }) when there's only 1 .card
// RIGHT: gsap.from('.card', { stagger: 0.1 }) when there are multiple .card elements

// Check: Is stagger value reasonable?
// 0.05-0.1 = fast cascade
// 0.1-0.2 = noticeable sequence  
// 0.3+ = dramatic one-by-one
```

#### Fix: Easing Feels Wrong
```javascript
// Common GSAP easings and when to use them:
// "power1.out" — gentle deceleration (subtle)
// "power2.out" — moderate deceleration (most common)
// "power3.out" — strong deceleration (dramatic entrance)
// "power4.out" — very strong (elements feel like they slam into place)
// "back.out(1.7)" — slight overshoot (bouncy, playful)
// "elastic.out(1, 0.3)" — spring physics (very bouncy)
// "expo.out" — sharp start, long ease (premium feel)

// CSS equivalent:
// power2.out ≈ cubic-bezier(0.16, 1, 0.3, 1)
// power3.out ≈ cubic-bezier(0.33, 1, 0.68, 1)
// expo.out ≈ cubic-bezier(0.16, 1, 0.3, 1) (close enough)
```

### Step 6: Re-Test and Verify

After applying fixes:
1. Reload the built site in Chrome
2. **Scroll through the ENTIRE page slowly** — verify every animation triggers
3. **Hover over every interactive element** — verify hover states
4. **Hard-reload the page** — verify page load animation sequence
5. Take new screenshots
6. If animations are still off, re-run the scroll behavior comparison (Step 3b-1)

### Step 7: Write Iteration Report (Enhanced)

Save to `./ui-clone-workspace/iteration-{N}.md`:

```markdown
# Iteration [N] Report

## Issues Found: [count]
- P0 Critical: [count]
- P1 Important: [count]  
- P2 Polish: [count]

## Visual Issues
[Layout, color, typography, content issues — same as v1]

## Animation/Behavior Issues (NEW)
### Missing Animations
- [ ] [Element] should [animate how] on [trigger] but doesn't animate at all
### Wrong Animation Parameters
- [ ] [Element] fades in over 300ms but reference is 800ms
- [ ] [Element] uses ease-in-out but reference uses power3.out
### Missing Interactions
- [ ] [Element] has no hover effect but should [scale/glow/shift]
### Scroll Behavior Mismatches
- [ ] [Section] should pin for 200vh but scrolls normally
- [ ] [Element] parallax speed is [actual] but should be [expected]

## Fixes Applied
### P0 Fixes
1. **[Issue]**: [What was wrong] → [What was changed, with code]
...

## Remaining Issues
[List anything not fixed and why]

## Recommendation
[Run another iteration? Focus on what?]
```

## Multi-Pass Strategy (Updated)

- **Iteration 1**: Focus on P0 — layout, structure, major visual, **animations loading at all**
- **Iteration 2**: Focus on P1 — spacing, **scroll trigger positions, pin/scrub, parallax, hover states**
- **Iteration 3+**: Focus on P2 — **easing curves, durations, stagger timing**, micro-polish

Typically 2-3 iterations get to ~90% match. Animation polish (easing, timing) is where the last 5-10% lives.
