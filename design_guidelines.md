# Financial SaaS Landing Page - Design Guidelines

## Design Approach
**Reference-Based: Premium SaaS Pattern** - Drawing inspiration from Stripe's sophistication, Linear's bold typography, and Notion's clarity. This conversion-focused landing prioritizes trust-building, visual hierarchy, and professional credibility for financial software.

**Key Principles:** High contrast for clarity, bold typography for impact, generous whitespace for professionalism, strategic yellow accents for conversion points.

## Core Design Elements

### Typography
- **Primary Font:** Inter (700 weight for headlines, 400-500 for body)
- **H1 Hero:** 56-64px desktop, 600-700 weight, tight leading (1.1)
- **H2 Sections:** 40-48px, 600-700 weight
- **H3 Features:** 24-28px, 600 weight
- **Body:** 18px, 400 weight, relaxed leading (1.6)
- **Small Print/Labels:** 14-16px, 500 weight
- **Numbers/Stats:** Tabular figures, 700 weight for emphasis

### Layout System
**Tailwind Spacing:** Units of 4, 8, 12, 16, 20, 24
- Section padding: py-20 to py-32 (desktop), py-12 to py-16 (mobile)
- Container: max-w-7xl with px-6 to px-8
- Component spacing: gap-8 to gap-12
- Card padding: p-8

### Color Palette
- **Primary (Blue):** #005CB8 for CTAs, highlights, key metrics
- **Primary Hover:** #0047A3
- **Background:** #0A0A0A (dark base), #141414 (elevated surfaces)
- **Accent Blue:** #005CB8 for links, secondary actions, trust indicators
- **Text Primary:** #FFFFFF (white on dark)
- **Text Secondary:** #A3A3A3 (gray-400)
- **Borders:** #2A2A2A subtle divisions
- **Success Indicators:** #10B981 (green-500)

## Landing Page Structure

### Navigation Header
Fixed top bar with backdrop blur, border-b in #2A2A2A
- Logo left, navigation center (Product, Pricing, Resources, Company)
- CTA buttons right: "Login" (text), "Start Free Trial" (yellow primary)
- Height: h-16, container max-w-7xl

### Hero Section (80vh)
Full-width dark background with subtle gradient radial overlay (blue accent to transparent)
**Layout:** Two-column (lg:grid-cols-2) with gap-12
- **Left Column:** Headline + subheadline + CTA stack + trust badges row
  - H1 with gradient text effect (yellow to white)
  - Subheadline: text-xl, text-gray-400
  - Primary CTA (yellow) + Secondary CTA (outline white)
  - Trust row: "Trusted by 500+ companies" with logo icons
- **Right Column:** Hero dashboard mockup image (floating with subtle shadow and glow effect)

### Social Proof Section (py-20)
Background: #141414
**Layout:** Center-aligned with max-w-4xl
- Headline: "Trusted by finance teams worldwide"
- Logo cloud grid (grid-cols-2 md:grid-cols-4) with grayscale filters
- Stat bar below: 3-column grid with large numbers (yellow) + labels

### Features Grid (py-24)
Background: #0A0A0A
**Layout:** 3-column grid (lg:grid-cols-3) with gap-8
- Each card: border #2A2A2A, p-8, rounded-xl, hover:border-yellow transition
- Icon (yellow, 40px), title (H3), description (text-gray-400)
- 6-9 feature cards total showcasing capabilities

### Product Showcase (py-32)
Alternating 2-column layouts (image-text, text-image pattern)
- 3-4 key features with detailed descriptions
- **Left/Right:** Screenshot/mockup images with border glow effect
- **Right/Left:** Content block with H2, description, bullet points, "Learn more" link (blue accent)
- Background: subtle gradient sections alternating #0A0A0A and #141414

### Pricing Section (py-24)
Background: radial gradient (yellow opacity 5% center)
**Layout:** 3-column cards (lg:grid-cols-3) with gap-6
- Pricing tiers: Starter, Professional, Enterprise
- Cards: border #2A2A2A, p-8, rounded-xl
- Recommended tier: border-yellow, shadow-xl, transform scale-105
- Price: Large number (48px, yellow), billing period below
- Feature list: checkmarks (yellow), text-gray-300
- CTA button at bottom (yellow for recommended, outline for others)

### Testimonials (py-20)
Background: #141414
**Layout:** 2-column grid (lg:grid-cols-2) with gap-8
- 4 testimonial cards with quotes, avatar, name, company, role
- Cards: p-6, border #2A2A2A, rounded-lg
- Quote icon (yellow, 24px)

### Final CTA Section (py-32)
Background: gradient (yellow to blue, opacity 10%)
**Layout:** Center-aligned max-w-3xl
- Large H2: "Ready to transform your financial operations?"
- Subheadline paragraph
- CTA button pair (yellow primary + outline secondary)
- Small text: "No credit card required • 14-day free trial"

### Footer (py-16)
Background: #0A0A0A, border-t #2A2A2A
**Layout:** 4-column grid with gap-8, plus bottom bar
- Columns: Product, Company, Resources, Legal
- Newsletter signup form (right column): input + yellow button
- Bottom bar: Copyright, social icons (blue hover), language selector

## Component Library

### Buttons
- **Primary CTA:** bg-yellow (#FFBB00), text-black, font-semibold, px-8, py-3.5, rounded-lg, shadow-lg with yellow glow
- **Secondary:** border-2 border-white, text-white, hover:bg-white/10
- **Text Links:** text-blue (#0066FF), underline-offset-4, hover:underline

### Cards
- Border: border #2A2A2A
- Background: #141414 on #0A0A0A base
- Radius: rounded-xl
- Padding: p-6 to p-8
- Hover: border-yellow/50, subtle lift transition

### Form Inputs (Newsletter, Contact)
- Background: #141414
- Border: border-gray-600, focus:border-yellow
- Text: white, placeholder-gray-500
- Height: h-12, px-4, rounded-lg

### Stats/Numbers Display
- Number: text-5xl to text-6xl, font-bold, text-yellow
- Label: text-sm, text-gray-400, uppercase, tracking-wide

## Icons
**Heroicons** (outline style) - CheckCircle, Shield, ChartBar, Lock, Sparkles, ArrowRight

## Images

### Hero Section
**Dashboard Mockup:** Modern financial dashboard screenshot showing charts, tables, real-time data. Dark themed UI with yellow/blue accent colors. Perspective tilt (subtle 3D effect). Floating with shadow and subtle glow.

### Product Showcase
**Screenshot Series (3-4 images):** 
1. Analytics dashboard with revenue graphs
2. Transaction management interface
3. Team collaboration view
4. Reporting/export functionality
Each in high resolution, showing realistic data, professional composition with consistent dark theme and accent colors.

### Optional Background Elements
Subtle abstract financial icons (currency symbols, graph lines) as decorative SVG patterns in sections - low opacity (#FFFFFF at 3-5%)

## Responsive Behavior
- Desktop (lg+): Multi-column layouts as specified
- Tablet (md): 2-column grids, hero stacks
- Mobile: Single column, py-12 sections, h-14 header