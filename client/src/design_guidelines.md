# Design Guidelines - HUA Consultoria e Análise

## Brand Colors
- **Primary Blue**: #001F47 (Deep Professional Blue)
- **Accent Orange**: #FFC933 (Golden accent for highlights)
- **Sidebar Black**: #030303 (Near-pure black for sidebar)
- **White**: #FFFFFF (Light backgrounds)

## Color Scheme

### Light Mode
| Element | Hex | HSL | Usage |
|---------|-----|-----|-------|
| Primary | #001F47 | 209 95% 15% | Headings, text, primary actions |
| Accent | #FFC933 | 39 100% 50% | Highlights, positive trends |
| Sidebar | #030303 | 209 95% 1% | Sidebar background |
| Destructive | #FF0000 | 0 100% 50% | Warnings, negative trends |
| Background | #FFFFFF | 0 0% 100% | Main background |

### Dark Mode
| Element | Hex | HSL | Usage |
|---------|-----|-----|-------|
| Primary | #001F47 | 209 95% 20% | Headings, primary actions |
| Sidebar | #030303 | 209 95% 1% | Sidebar background (same) |
| Card Background | #1E293B | - | Card backgrounds |
| Text | #FFFFFF | 0 0% 95% | Primary text |
| Muted Text | #94A3B8 | - | Secondary text |

## Typography
- **Font Family**: Inter, sans-serif
- **Headings**: Bold, tracking-tight (text-3xl for page titles)
- **Subheadings**: text-base font-semibold for card titles
- **Body**: Regular font-medium for labels, text-sm for descriptions

## Components

### KPI Cards
- Blue (#001F47) text for values
- Blue (#001F47) background at 10% opacity for icon containers
- Hover elevation effect enabled
- Trend indicators (green for positive, red for negative)

### Data Cards
- White background in light mode, slate-900 in dark mode
- Blue (#001F47) borders at 20% opacity
- Dark text (#001F47) in light mode, white in dark mode
- Consistent padding and spacing

### Sidebar
- Black background (#030303)
- Logo positioned at top with consistent padding
- Menu items with icons and labels
- White text (#FFFFFF or near-white)
- Golden accent for active states

### Header
- Sidebar toggle button
- Consistent spacing and alignment

## Spacing
- **Small**: 4px (0.25rem) - for icon gaps
- **Medium**: 8px (0.5rem) - for element spacing
- **Large**: 24px (1.5rem) - for section margins
- **Extra Large**: 32px (2rem) - for page margins

## Responsive Breakpoints
- **Mobile**: < 640px (1 column)
- **Tablet**: 640px - 1024px (2 columns)
- **Desktop**: > 1024px (3-4 columns)

## Dark Mode Implementation
- All backgrounds and text adapt via CSS variables
- Primary color (#001F47) works well on both light and dark
- Cards use slate-900 background in dark mode
- White text for primary headings in dark mode
- Maintains contrast requirements in both modes

## Interactions
- **Hover States**: `hover-elevate` class for subtle background elevation
- **Active States**: Built into Shadcn Button components
- **Transitions**: Smooth and subtle, no jarring animations
- **Accessibility**: All interactive elements have clear visual states

## Layout Structure
```
┌─────────────────────────────────────┐
│ Sidebar (16rem)    │ Header        │
│ - Logo            │ - Toggle       │
│ - Menu Items      │ - Nav          │
│───────────────────┼────────────────│
│                   │ Main Content   │
│                   │ - Dashboard    │
│                   │ - Cards        │
│                   │ - Charts       │
│                   │                │
└─────────────────────────────────────┘
```

## Design Patterns
1. **Cards**: Used for data display with consistent styling
2. **KPI Cards**: Used for key metrics with trend indicators
3. **Icons**: Lucide React icons for visual hierarchy
4. **Typography**: Clear hierarchy with size and color variations
5. **Spacing**: Consistent gaps and padding throughout

## Best Practices
- Always use HSL values for colors (not hardcoded hex in utility classes)
- Maintain blue (#001F47) as primary color throughout
- Use black (#030303) only for sidebar
- Keep accent orange (#FFC933) for highlights and positive indicators
- Ensure proper contrast between text and background
- Test designs in both light and dark modes
- Use semantic color names when possible (primary, accent, destructive)
