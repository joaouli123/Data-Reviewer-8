# HUA - Consultoria e Análise | Design Guidelines

## Brand Identity

**Brand Name**: HUA - Consultoria e Análise  
**Vision**: Global financial consulting and analysis platform

### Brand Colors

**Primary Color - Royal Blue**
- Hex: #0066CC
- HSL: 210° 100% 40%
- RGB: 0, 102, 204
- Usage: Headers, primary buttons, active states, key metrics

**Secondary Color - Golden Yellow**
- Hex: #FFB800
- HSL: 39° 100% 50%
- RGB: 255, 184, 0
- Usage: Accents, highlights, trends, emphasis elements, icons

**Supporting Colors**
- Success (Green): 120° 70% 50%
- Alert/Warning (Orange): 35° 100% 50%
- Danger (Red): 0° 100% 50%
- Neutral (Gray): 0° 0% 50%

## Design Approach: Material Design System
Selected for excellent treatment of data-dense interfaces, card-based layouts, and professional aesthetic suitable for financial consulting applications.

## Typography System

**Font Family**: Inter (primary), Roboto Mono (monospaced numbers)
- Dashboard Title/Headers: 3xl, semibold (600), color: Royal Blue
- Section Headers: xl-2xl, semibold (600), color: Royal Blue
- Card Titles: base-lg, medium (500), color: foreground
- Metric Values: 2xl-3xl, bold (700) with tabular numbers, color: Royal Blue
- Metric Labels: sm, medium (500), uppercase tracking-wide, color: muted-foreground
- Trend Text: sm, medium (500), color: Gold for positive, Red for negative
- Body/Descriptions: sm, regular (400)

## Color System

### Light Mode
- **Background**: #F7F9FC (near white with blue tint)
- **Card**: #FFFFFF (pure white)
- **Foreground**: #0A1929 (very dark blue-gray)
- **Muted**: #7A8C9D (medium gray)
- **Border**: #DFE3E9 (light gray)

### Dark Mode
- **Background**: #0F1419 (very dark)
- **Card**: #1A1F2E (dark card)
- **Foreground**: #E8EEF7 (light blue-gray)
- **Muted**: #7A8C9D (medium gray)
- **Border**: #2A3542 (dark gray)

## Component Library

### Header/Navigation
- Top bar with logo, navigation, user profile
- Height: h-16
- Background: Royal Blue gradient or solid Royal Blue
- Text: White/Light text on Royal Blue
- Sticky positioning for scrolling contexts

### KPI Metric Cards (Primary Components)
Structure per card:
- Rounded corners: rounded-lg
- Border: 1px border with light color
- Icon container: w-12 h-12, rounded-lg with Gold accent background
- Icon color: Royal Blue
- Metric value: Large, bold typography in Royal Blue
- Metric label: Above value, uppercase, small, gray text
- Trend indicator: 
  - Positive trend: Green with up arrow
  - Negative trend: Red with down arrow
- Hover state: Subtle lift with enhanced shadow

### Buttons
- **Primary Button**: Royal Blue background, white text
- **Secondary Button**: Gold background, dark text
- **Outline Button**: Border in Royal Blue, text in Royal Blue
- **Ghost Button**: Transparent, Royal Blue text
- Rounded: rounded-md
- All buttons have automatic hover elevation via hover-elevate utility

### Icon System
**Primary Icons** (Royal Blue):
- TrendingUp, TrendingDown, DollarSign, Activity, CreditCard

**Accent Icons** (Gold):
- Star, Zap, Award (for highlights/achievements)

**Action Icons** (Royal Blue):
- Settings, Filter, Export, Download

### Data Tables
- Striped rows for scanability
- Header: Royal Blue background, white text
- Row hover: Subtle Blue tint
- Numeric columns: Right-aligned, monospaced
- Action column: Icon buttons with hover elevation

### Cards and Containers
- Background: White (light) / Dark gray (dark)
- Border: Subtle, 1px
- Padding: p-6
- Shadow: subtle (shadow-sm on hover)
- Corner radius: rounded-lg

## Dashboard Layout

**Primary Layout**:
1. Header (Royal Blue) with logo and navigation
2. Page Title with subtitle and action buttons
3. KPI Overview Grid (4 columns on desktop)
   - Responsive: 1 column mobile, 2 columns tablet, 4 columns desktop
   - Gap: 6 units
4. Secondary Metrics Grid (3 columns)
5. Summary/Additional Analysis Cards

## Spacing & Rhythm

- Page container: py-6 px-8
- Section spacing: space-y-8 between major sections
- Card grids: gap-6
- Within cards: space-y-4 for stacked elements
- Card padding: p-6

## Interaction Patterns

**Card Hover States**: Subtle lift using hover-elevate utility
**Button States**: Automatic elevation via hover-elevate and active-elevate-2
**Loading States**: Skeleton screens matching card structure
**Color on Hover**: Use elevation (shadow/background tint), not color change

## Accessibility

- All interactive elements: minimum 44px touch target
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon-only buttons
- Sufficient contrast ratios (Royal Blue on white has excellent contrast)
- Focus indicators: ring-2 ring-offset-2 with Royal Blue

## Logo Usage

- Place logo in header (left side) on Royal Blue background
- Logo shows: Yellow dollar sign on blue globe with "HUA" text in white
- Size: Responsive, typically 40-50px height in header
- Maintain whitespace around logo

## Brand Voice

- Professional and trustworthy
- Clear and direct communication
- Data-driven insights
- Global perspective

## Images

This is an application dashboard. Focus entirely on:
- Data visualization
- Functional UI components
- Clean typography and icons from lucide-react

No hero images or decorative backgrounds beyond solid colors and subtle gradients.
