# Phase 3 — Merge & Map Protocol

## Overview

This is the critical synthesis phase. Take the Site DNA (what the reference site does) and the Brand Interview (what the user wants) and produce a section-by-section build specification that maps the user's brand onto the reference site's design patterns.

## Merge Process

### Step 1: Design System Translation

Map the reference site's design system to the user's brand:

```markdown
## Design System

### Color Palette
| Role | Reference Value | Your Brand Value | CSS Variable |
|------|----------------|-----------------|--------------|
| Primary | #reference | #yours | --color-primary |
| Secondary | #reference | #yours | --color-secondary |
| Accent | #reference | #yours | --color-accent |
| Background | #reference | #yours | --color-bg |
| Surface | #reference | #yours | --color-surface |
| Text Primary | #reference | #yours | --color-text |
| Text Secondary | #reference | #yours | --color-text-muted |
| Border | #reference | #yours | --color-border |

### Typography
| Role | Reference | Your Brand | CSS Variable |
|------|-----------|-----------|--------------|
| Display Font | [font] | [font] | --font-display |
| Body Font | [font] | [font] | --font-body |
| Mono Font | [font] | [font] | --font-mono |

[Include full size scale, weight scale, line heights]

### Spacing & Layout
[Container max-width, section padding, component gaps — keep identical to reference unless user specified otherwise]

### Effects
[Border radii, shadows, gradients, blurs — adapt colors but keep structure identical]
```

### Step 2: Section-by-Section Mapping

For EACH section identified in the Site DNA, create a detailed mapping:

```markdown
## Section [N]: [Section Name]

### Reference Behavior
[Copy from Site DNA — what the reference site does in this section]

### Your Version

**Layout**: [Identical to reference / Adapted — describe changes]

**Content**:
- Heading: "[Exact text to use]"
- Subheading: "[Exact text to use]"
- Body: "[Exact text to use]"
- CTA Button: "[Button text]" → [link destination]
- [List items, feature names, stats, whatever this section contains]

**Images/Media**:
- [Description of what each image should show]
- [Dimensions and treatment: rounded corners, overlay, etc.]
- [Use placeholder services: picsum.photos, placehold.co, or descriptive SVG placeholders]

**Animations** (replicate from reference):
- Entry: [exact animation description with timing]
- Scroll: [parallax/sticky/pin behavior]
- Hover: [interaction details]
- Micro: [any micro-interactions]

**Responsive**:
- Desktop: [layout description]
- Tablet: [layout changes]
- Mobile: [layout changes]
```

### Step 3: Generate Missing Content

For any content the user didn't provide, generate it now. The content must:

1. **Match the brand voice** from the interview
2. **Mirror the content TYPE of the reference** (if reference has 3 feature cards, generate 3 feature cards)
3. **Be specific and credible** — no generic "Lorem ipsum" or "We provide solutions." Write real copy.
4. **Match the content LENGTH** of the reference — if the reference hero has a 6-word headline, yours should be ~6 words too

**Content generation guidelines:**
- Headlines: Short, punchy, benefit-driven
- Feature descriptions: Specific, concrete, focus on outcomes not features
- Testimonials: Realistic names, titles, specific praise (not generic "Great product!")
- Stats/numbers: Plausible, impressive but not absurd
- CTA text: Action-oriented, urgent but not pushy

### Step 4: Animation Specification

Create a dedicated animation reference that the builder can follow:

```markdown
## Animation Specifications

### Global Settings
- Default easing: [cubic-bezier or named easing from reference]
- Default duration: [ms]
- Scroll trigger offset: [when elements enter viewport — e.g., "when 20% visible"]
- Stagger delay between items: [ms]

### Page Load Sequence
1. [Element] — [animation] — delay [ms]
2. [Element] — [animation] — delay [ms]
...

### Scroll-Triggered Animations
| Section | Element | Animation | Duration | Easing | Trigger |
|---------|---------|-----------|----------|--------|---------|
| Hero | Heading | fade-up 30px | 800ms | ease-out | page load |
| Hero | Subtext | fade-up 30px | 800ms | ease-out | 200ms delay |
| Features | Cards | fade-up staggered | 600ms | ease-out | scroll into view |
...

### Hover Interactions
| Element | Effect | Duration | Easing |
|---------|--------|----------|--------|
| Nav links | underline slide-in | 300ms | ease |
| Cards | scale(1.02) + shadow | 300ms | ease-out |
| Buttons | background shift + scale(1.05) | 200ms | ease |
...

### Special Effects
[Parallax layers, particle systems, gradient animations, cursor followers, etc.]
```

### Step 5: Responsive Breakpoints

```markdown
## Responsive Breakpoints
- Desktop: ≥1280px — full layout as designed
- Laptop: 1024px-1279px — [changes]
- Tablet: 768px-1023px — [changes]
- Mobile: <768px — [changes]

### Navigation Responsive Behavior
- Desktop: [full nav bar]
- Mobile: [hamburger → slide-in menu / bottom sheet / etc.]

### Section-Specific Responsive Changes
[For each section, note layout changes at breakpoints]
```

## Write the Build Spec

Compile everything into `./ui-clone-workspace/build-spec.md`. This document should be comprehensive enough that someone who has never seen the reference site could build an accurate version.

## Quality Self-Check

Before saving, verify:
- [ ] Every section from the Site DNA has a corresponding mapping
- [ ] All content fields have actual text (no "[TODO]" or "[placeholder]")
- [ ] Color palette is complete with CSS variable names
- [ ] Typography is fully specified with Google Fonts URLs
- [ ] Every animation has timing, easing, and trigger specified
- [ ] Responsive behavior is noted for all major sections
- [ ] Tech stack dependencies are listed (CDN links, libraries)

**Immediately proceed to Phase 4** after saving.
