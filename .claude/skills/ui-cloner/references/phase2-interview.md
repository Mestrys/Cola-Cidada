# Phase 2 — Brand Interview Protocol

## Overview

This phase collects everything needed to adapt the reference site's design to the user's brand. The interview should feel like a productive creative brief session, not a boring form.

## Interview Approach

**Adapt to the user's style:**
- If they're detailed and engaged → go question by question, discuss each
- If they're quick/impatient → present all questions at once, let them fill in
- If they say "make something up" → generate a compelling fictional brand, show it to them for approval

**Be opinionated.** If the user gives vague answers, suggest specific options based on what would work well with the reference site's design. Example:
- User: "I don't know, something modern?"
- You: "Based on the reference site's dark, techy vibe, I'd suggest: 'Precision-engineered. Quietly confident. Like a Bloomberg terminal meets Apple.com.' Does that resonate, or should we go a different direction?"

## Core Questions

### 1. Identity
**Question**: "What's the name of your app / brand / project?"
**If blank**: Generate a punchy name that fits the reference site's vibe.

### 2. Tagline
**Question**: "Give me a one-liner tagline or value proposition — the thing that goes in the hero section."
**If blank**: Write 3 options, let them pick.
**Good taglines**: Specific, benefit-driven, memorable. Not generic fluff.

### 3. Product Description
**Question**: "What does your product/service do? What problem does it solve? Give me 2-3 sentences."
**Why it matters**: This drives all body copy, feature descriptions, and CTA language.

### 4. Target Audience
**Question**: "Who is your ideal user/customer? Be as specific as you can — age, profession, tech comfort, pain points."
**Why it matters**: Determines tone, complexity of language, visual sophistication level.

### 5. Brand Personality
**Question**: "Pick 3-5 adjectives that describe how your brand should FEEL. Examples: sleek, playful, clinical, rebellious, premium, approachable, futuristic, earthy, bold, minimalist, warm, edgy."
**If blank**: Suggest adjectives based on the reference site's vibe + the user's product.

### 6. Color Direction
**Question**: "Any color preferences? Or should I match the reference site's vibe?"
**Options to offer**:
  - Keep the reference site's exact palette
  - Keep the vibe but with your brand colors (provide hex codes)
  - Completely different palette (provide hex codes or describe)
  - Let me suggest something based on your brand personality

### 7. Section Structure
**Question**: "The reference site has these sections: [list from Site DNA]. Do you want to:
  A) Keep the exact same section structure (recommended for best results)
  B) Keep most sections but add/remove some (tell me which)
  C) Only keep the visual style, completely restructure the content"

**Recommendation**: Always recommend option A for the first pass — it produces the best results. The user can iterate later.

### 8. Content Readiness
**Question**: "Do you have specific content ready for any of these? (headlines, feature names, testimonial quotes, pricing tiers, etc.) Or should I generate placeholder content that fits your brand?"

**If they have content**: Collect it organized by section.
**If they don't**: You'll generate it in Phase 3. Note this.

### 9. Must-Haves and Must-Not-Haves
**Question**: "Anything you specifically want included or excluded? (e.g., 'I need a pricing section', 'No testimonials', 'Must have a demo video embed', 'No cookie banners')"

### 10. Tech Stack
**Question**: "What tech stack do you want the build in?"
**Default recommendation**: Single `index.html` with Tailwind CSS (CDN), vanilla JS, Google Fonts. This is the most portable, easiest to deploy, and works in any AI coding tool.
**Other common options**:
  - React + Tailwind (if they want components)
  - Next.js (if they need routing/SSR)
  - Astro (if they want performance)
  - HTML + custom CSS (if they prefer no frameworks)

## Writing the Brand Interview Document

After collecting all answers, write `./ui-clone-workspace/brand-interview.md`:

```markdown
# Brand Interview Results

## Identity
**Name**: [name]
**Tagline**: [tagline]
**Product Description**: [description]

## Audience
**Target**: [audience description]
**Audience Persona**: [synthesized persona: name, age, job, pain points, what they value]

## Brand Personality
**Adjectives**: [3-5 adjectives]
**Brand Voice**: [1-2 sentences describing how the brand speaks — formal? casual? technical? friendly?]
**Brand Feeling**: [what should someone FEEL when they land on this site?]

## Visual Direction
**Color Approach**: [keep reference / adapt / custom]
**Color Details**: [any specific colors or preferences]
**Overall Vibe**: [synthesis of personality + reference site aesthetic]

## Section Structure
**Approach**: [keep all / adapt / restructure]
**Sections to include**:
1. [Section name] — [brief content description]
2. [Section name] — [brief content description]
...
**Sections to exclude**: [if any]
**Sections to add**: [if any]

## Content
**Ready content**: [list what they provided]
**Needs generation**: [list what needs to be created]

## Specific Requirements
**Must have**: [list]
**Must not have**: [list]

## Tech Stack
**Choice**: [stack]
**Dependencies**: [CDN links, libraries needed]
```

## After the Interview

Once the document is written, confirm with the user: "Here's what I've captured — anything you want to change before I merge this with the site DNA?"

If they approve (or say nothing), **immediately proceed to Phase 3**.
