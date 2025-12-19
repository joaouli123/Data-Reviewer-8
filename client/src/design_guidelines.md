# Design Guidelines

## Color Scheme
- **Primary**: Blue (210 100% 40%) - Used for main actions, headings, and primary elements
- **Secondary/Accent**: Orange/Yellow (39 100% 50%) - Used for highlights and accent elements
- **Destructive**: Red (0 100% 50%) - Used for warnings and errors
- **Muted**: Gray (210 10% 50-60%) - Used for secondary text and borders

## Typography
- **Font Family**: Inter, sans-serif
- **Headings**: Bold, tracking-tight
- **Body**: Regular font-medium for labels, normal for content

## Components
- **KPI Cards**: Blue primary backgrounds with trend indicators (green for positive, red for negative)
- **Action Cards**: Solid blue backgrounds for primary actions, orange for secondary actions
- **Data Cards**: Subtle blue borders with primary text
- **Icons**: Lucide React icons, sized consistently (h-6 w-6 for main, h-4 w-4 for indicators)

## Spacing
- **Cards**: p-6 for content padding, pb-3 for headers
- **Grid Gaps**: gap-6 for spacing between card columns
- **Responsive**: 1 column on mobile, 2-3 columns on tablet, 4+ on desktop

## Dark Mode
- Background transitions to dark blue (210 20% 8%)
- Cards use slightly elevated contrast (210 20% 12%)
- Text adapts automatically with color variables
- All colors maintain contrast in both light and dark modes

## Interactions
- **Hover States**: Use `hover-elevate` class for subtle background elevation
- **Buttons**: Use variant-appropriate hover states (pre-configured)
- **Cards**: Subtle hover effect with `hover-elevate` for better UX

## Layout
- **Dashboard**: Max-width 6xl container, centered content
- **Header**: Clear typography hierarchy with description text
- **Grids**: Responsive grid using Tailwind breakpoints (md:, lg:)
- **Cards**: Consistent padding and border styling with primary/20 opacity borders
