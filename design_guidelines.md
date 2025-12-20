# Price Calculator App - Design Guidelines

## Design Approach
**Material Design System** - Selected for robust form handling, data display patterns, and professional business aesthetic. This utility-focused application prioritizes clarity, efficiency, and professional credibility.

## Core Design Elements

### Typography
- **Primary Font:** Inter (Google Fonts)
- **Headings:** 600 weight, 24-32px
- **Body:** 400 weight, 16px
- **Labels:** 500 weight, 14px
- **Numbers/Calculations:** 500-600 weight, 18-24px (tabular figures)

### Layout System
**Tailwind Spacing:** Use units of 4, 6, 8, 12, 16
- Form sections: p-6 to p-8
- Card spacing: gap-6
- Section margins: mb-8 to mb-12
- Input spacing: space-y-4

### Color Palette
- **Primary Accent:** #0059A8 (buttons, active states, highlights)
- **Primary Hover:** #004785
- **Backgrounds:** White base, gray-50 for sections
- **Borders:** gray-200 for inputs, gray-300 for cards
- **Text:** gray-900 primary, gray-600 secondary
- **Success:** green-600 for positive results
- **Alert:** amber-600 for warnings

## Layout Structure

### Main Application Layout
**Two-Column Desktop (3:2 ratio)**
- Left: Input forms (60% width)
- Right: Live calculation results (40% width)
- Mobile: Stack vertically

### Header
Navigation bar with logo, calculator name, and secondary actions (save, export, settings icons)

### Form Section (Left Column)
**Card-based form groups:**
- Product/Service Details card
- Quantity & Units card
- Cost Breakdown card
- Margins & Adjustments card
- Each card: rounded-lg, border, shadow-sm, p-6, bg-white

### Results Panel (Right Column)
**Sticky positioned calculation display:**
- Summary card at top (total, profit margin %)
- Detailed breakdown table
- Price comparison chart
- Export/Share buttons at bottom
- Background: gray-50, cards with white bg

## Component Library

### Form Inputs
- Text inputs: border-gray-300, focus:border-[#0059A8], focus:ring-2, focus:ring-[#0059A8]/20
- Number inputs: Right-aligned text for calculations
- Dropdowns: Custom styled selects with chevron icons
- Checkboxes/Radio: #0059A8 accent color
- Labels: Above inputs, 14px, gray-700, 500 weight

### Buttons
- **Primary:** bg-[#0059A8], text-white, hover:bg-[#004785], px-6, py-2.5, rounded-md
- **Secondary:** border-gray-300, bg-white, hover:bg-gray-50
- **Icon buttons:** Square, p-2, hover:bg-gray-100

### Data Display
- **Results Table:** Zebra striping (gray-50), bordered cells, right-aligned numbers
- **Calculation Cards:** Large numbers (24-28px), small labels above, icon indicators
- **Progress/Percentage Bars:** #0059A8 fill, gray-200 background

### Cards
- Border: border-gray-200
- Shadow: shadow-sm
- Radius: rounded-lg
- Padding: p-6
- Hover state: hover:shadow-md transition

## Specific Features

### Live Calculation Display
Real-time update indicators with subtle #0059A8 pulse animation when values change

### Breakdown Visualization
Horizontal bar chart showing cost components, using #0059A8 shades (from #0059A8 to #66A3D2)

### Action Bar (Bottom)
Sticky footer with Save, Reset, Export buttons (right-aligned), subtle shadow-lg upward

## Responsive Behavior
- Desktop (lg+): Two-column layout
- Tablet (md): Single column, results below inputs
- Mobile: Full stack, sticky results summary bar at bottom

## Icons
**Heroicons** (outline style) - Calculator, ChartBar, DocumentText, Cog, Download, Save

## Images
No hero images needed. This is a utility application focused on functionality and data display.