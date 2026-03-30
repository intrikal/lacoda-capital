# Lacoda Capital Holdings

![CI](https://github.com/intrikal/lacoda-capital/actions/workflows/ci.yml/badge.svg)

**The Operating System for Asset Management & Holdings Firms**

A premium, story-driven SaaS website and fully interactive dashboard demo built with Next.js, React Three Fiber, and react-spring.

---

## Story Concept

The site tells a clear narrative in three acts:

### ACT 1 - CHAOS → CLARITY (Home Page)
Assets are scattered across platforms, documents, accounts, and people. The **Asset Constellation** 3D visualization shows how Lacoda unifies everything into one system of record.

### ACT 2 - SECURITY → TRUST (Security Page)
Your assets live in a **Vault**. Every action is written to an immutable **Ledger**. The visual language reinforces trust, RBAC, audit logs, and encryption.

### ACT 3 - EXECUTION → OUTCOMES (Platform + Demo)
The interactive dashboard demonstrates how the system works day-to-day for portfolio managers.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | TailwindCSS v4 + Custom Theme |
| UI Components | shadcn/ui patterns (Radix primitives) |
| 3D Graphics | react-three-fiber + drei |
| Animations | react-spring (@react-spring/web, @react-spring/three) |
| Charts | Recharts |
| Icons | lucide-react |
| Data | Hardcoded mock data (no external APIs) |

---

## Project Structure

```
lacoda-capital/
├── app/
│   ├── (marketing)/          # Marketing pages layout
│   │   ├── page.tsx          # Home page with 3D constellation
│   │   ├── platform/
│   │   ├── security/
│   │   ├── learn/
│   │   ├── pricing/
│   │   ├── demo/
│   │   └── contact/
│   ├── (dashboard)/          # Dashboard layout
│   │   └── app/
│   │       ├── page.tsx      # Dashboard overview
│   │       ├── assets/
│   │       ├── vault/
│   │       ├── ledger/
│   │       ├── reports/
│   │       ├── compliance/
│   │       ├── clients/
│   │       ├── integrations/
│   │       ├── help/
│   │       └── settings/
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles & theme
├── components/
│   ├── ui/                   # Base UI components
│   ├── marketing/            # Marketing page components
│   ├── dashboard/            # Dashboard components
│   └── 3d/                   # Three.js components
├── lib/
│   ├── mock/                 # Mock data
│   │   ├── types.ts          # TypeScript types
│   │   └── data.ts           # All mock data
│   ├── hooks/                # Custom React hooks
│   └── utils.ts              # Utility functions
└── public/
```

---

## Editing Mock Data

All mock data is centralized in `/lib/mock/data.ts`. To customize:

### Assets
```typescript
// lib/mock/data.ts
export const mockAssets: Asset[] = [
  {
    id: "ast-001",
    name: "Manhattan Office Tower",
    class: "real_estate",
    value: 45_000_000,
    // ... more fields
  },
  // Add or modify assets here
]
```

### Clients
```typescript
export const mockClients: Client[] = [
  {
    id: "client-001",
    name: "Blackwood Capital Group",
    aum: 72_200_000,
    // ... more fields
  },
]
```

### KPIs
```typescript
export const mockKPIs: KPIData[] = [
  {
    label: "Assets Under Management",
    value: 196_250_000,
    previousValue: 184_500_000,
    format: "currency",
    trend: "up",
  },
]
```

---

## Customizing the Teal Theme

The theme is defined in `/app/globals.css`:

```css
:root {
  /* Primary accent - Teal/Cyan */
  --primary: #14b8a6;         /* Main teal color */
  --primary-hover: #0d9488;   /* Darker on hover */
  --primary-muted: #134e4a;   /* For backgrounds */
  --primary-glow: rgba(20, 184, 166, 0.15);

  /* Secondary accent - Cyan */
  --secondary: #06b6d4;
  --secondary-hover: #0891b2;
}
```

To change the accent color, update these CSS variables. The entire app will reflect the changes.

---

## 3D Scene Location

The Asset Constellation visualization lives in:

```
/components/3d/asset-constellation.tsx
```

Key customization points:

### Node Positions & Sizes
```typescript
// lib/mock/data.ts
export const mockConstellationNodes: ConstellationNode[] = [
  {
    id: "node-re",
    label: "Real Estate",
    position: [-2, 0.5, 0],  // [x, y, z] coordinates
    size: 1.2,               // Node scale multiplier
    // ...
  },
]
```

### Node Colors
```typescript
// lib/mock/data.ts
export const assetClassConfig = {
  real_estate: { label: "Real Estate", color: "#0d9488", icon: "Building2" },
  equities: { label: "Equities", color: "#0891b2", icon: "TrendingUp" },
  // ...
}
```

### Animation Settings
```typescript
// components/3d/asset-constellation.tsx
<Float
  speed={reducedMotion ? 0 : 1.5}        // Floating animation speed
  rotationIntensity={reducedMotion ? 0 : 0.2}
  floatIntensity={reducedMotion ? 0 : 0.5}
>
```

---

## Accessibility

- **Reduced Motion**: All animations respect `prefers-reduced-motion`
- **Keyboard Navigation**: Full keyboard support for navigation and interactions
- **Focus States**: Visible focus indicators on all interactive elements
- **Semantic HTML**: Proper heading hierarchy and ARIA attributes

---

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Site Map

### Marketing Pages
| Route | Description |
|-------|-------------|
| `/` | Home - Story-driven landing with 3D constellation |
| `/platform` | Platform features overview |
| `/security` | Security & compliance information |
| `/learn` | Guides, tutorials, and FAQs |
| `/pricing` | Pricing plans |
| `/demo` | Demo request form |
| `/contact` | Contact form and office information |

### Dashboard (Demo App)
| Route | Description |
|-------|-------------|
| `/app` | Dashboard overview with KPIs and charts |
| `/app/clients` | Client CRM with profiles |
| `/app/assets` | Holdings table with detail drawer |
| `/app/vault` | Document management with folders and tags |
| `/app/ledger` | Immutable audit trail timeline |
| `/app/reports` | Report generation and builder |
| `/app/compliance` | SOC 2 controls checklist |
| `/app/integrations` | Third-party integrations (Stripe, etc.) |
| `/app/settings` | Profile, team, roles & preferences |
| `/app/help` | Help center with getting started checklist |

---

## Design Principles

1. **Enterprise Trust**: Dark theme with zinc/slate base colors projects professionalism
2. **Subtle Accents**: Teal/cyan used sparingly for emphasis, not decoration
3. **Purposeful Animation**: Motion adds meaning, not flash
4. **Information Density**: Dashboard designed for real work, not just demos
5. **Mobile Responsive**: All pages work on mobile devices

---

## Performance Notes

- 3D scene dynamically imported (no SSR) to reduce initial bundle
- Animations pause when tab is inactive
- All images optimized with Next.js Image component
- Minimal JavaScript on marketing pages

---

## License

Private - Lacoda Capital Holdings
