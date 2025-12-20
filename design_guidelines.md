# HUA Consulting App - Design Guidelines

## Design Approach
**System-Based: Linear + Notion Hybrid** - Productivity-focused with maximum information density, professional consulting aesthetic prioritizing efficiency and data visibility.

## Typography
- **Primary Font**: Inter (Google Fonts) - all weights 400-700
- **Scale**: 
  - Headers: 24px (semibold), 20px (medium)
  - Body: 14px (regular), 13px labels
  - Small: 12px metadata
- **Line Height**: 1.4 for body, 1.2 for headers

## Layout System
**Compact Spacing Units**: Use Tailwind's tightest spacing - `p-1, p-2, p-3, p-4, gap-2, gap-3, gap-4`
- Header padding: `px-4 py-2`
- Content sections: `p-4 md:p-6`
- Card internals: `p-3`
- Grid gaps: `gap-3`
- No generous whitespace - maximize screen real estate

**Container Strategy**:
- Full-width header (no max-width)
- Content: `max-w-7xl mx-auto px-4`
- Compact cards with minimal borders

## Core Components

### Header (Fixed Top)
- Height: 56px, background #040303
- Left: HUA logo (height 32px, transparent background)
- Center: Horizontal navigation tabs (14px, hover underline in #E7AA1C)
- Right: User avatar + notification icon
- No drop shadow, clean line separation

### Navigation
- Horizontal tabs in header
- Active state: yellow (#E7AA1C) bottom border (2px)
- Sections: Dashboard, Projetos, Clientes, Relatórios, Configurações

### Dashboard Cards
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`
- White background, subtle 1px border (#E5E7EB)
- Compact padding: `p-3`
- Headers with yellow accent indicators
- Data displays: Large numbers (28px semibold) + small labels below

### Data Tables
- Striped rows (alternating #FAFAFA)
- Compact row height: 40px
- 12px text for table cells
- Yellow highlights for important metrics
- Hover state: #F9FAFB background

### Forms
- Inline labels (left-aligned, 90px width)
- Compact inputs: height 36px
- Yellow focus rings
- Minimal vertical spacing: `gap-2`
- Group related fields tightly

### Buttons
- Primary: Yellow (#E7AA1C), 14px semibold, px-4 py-2
- Secondary: White bg, dark border, same sizing
- Small buttons: px-3 py-1.5, 13px text
- Hero overlay buttons: Blurred backdrop (backdrop-blur-sm, bg-white/20)

### Status Indicators
- Compact badges: 12px, px-2 py-0.5, rounded-full
- Use yellow for active/important states
- Gray scale for neutral states

## Images

**Hero Section**: Full-width professional consultation scene (1920x600px)
- Modern office setting or business handshake
- Overlay: Dark gradient bottom (to improve text readability)
- Positioned below header, with CTA buttons using blurred backgrounds

**Client Logos**: Small grayscale logos (120x60px) in compact grid below hero

**Dashboard Graphics**: Minimal data visualization placeholders (charts, graphs) - 300x200px cards

## Page Structure

**Landing/Home**:
1. Hero with image + blurred button CTAs
2. Compact 3-column service cards (gap-3)
3. Client logos grid (6 columns)
4. Compact contact form (2-column on desktop)

**App Dashboard**:
1. Metric cards row (3-4 columns, tight spacing)
2. Recent projects table (full-width)
3. Task list sidebar-replacement (right column, 30% width)

## Animations
None - prioritize instant responsiveness for professional tool aesthetic.

## Key Principles
- **Maximum Density**: Every pixel counts, no decorative spacing
- **Yellow Sparingly**: Use #E7AA1C only for critical actions/highlights
- **Professional Precision**: Sharp edges, clean borders, no rounded corners except small badges
- **Data-First**: Prioritize information display over visual flourishes