# Cash Flow Time Machine ⏳💰 (Cash Flow Navigator)

An interactive, real-time financial scenario builder and cash flow forecasting dashboard. This application allows founders, CFOs, and stakeholders to adjust financial "levers", simulate outcomes using Monte Carlo simulations, generate AI-powered narratives, and export professional reports.

## Features

- **Interactive Scenario Forecasting**: Adjust key financial levers (hiring, pricing, runway, spend) and see their immediate impact on cash flow projections.
- **Monte Carlo Simulations**: Run thousands of simulated paths in real-time to analyze probability distributions of runway length and cash positions.
- **AI-Powered CFO Narrative**: Automated narrative analysis of your scenario's strengths, weaknesses, and potential actions.
- **Stakeholder Sentiments**: Real-time mock reactions from key stakeholders (Board, Team, Investors) based on chosen scenario risk profiles.
- **Scenario Comparison Mode**: Compare two sets of levers (Scenario A vs. Scenario B) side-by-side to make data-driven decisions.
- **Supabase Integration**: Auto-saving, user authentication, and real-time multi-session sync (notifies you if a scenario is edited in another tab/session).
- **Export to PDF**: Generate and download beautifully structured PDF board reports with one click.
- **Keyboard Shortcuts**: Native power-user shortcuts for quick saves, resets, and exports.
- **Offline Banner & Local Cache**: Gracefully detects offline state and handles data recovery.

## Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/) & [Vite 7](https://vite.dev/)
- **Routing & SSR**: [TanStack Start / React Router](https://tanstack.com/router) & [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) for animations
- **UI Components**: [Radix UI primitives](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime channels)
- **PDF Generation**: `jspdf` & `html2canvas`
- **Package Manager**: [Bun](https://bun.sh/) (configured via `bun.lock` and `bunfig.toml`)

## Getting Started

### Prerequisites

You need [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/knarayanareddy/cash-flow-navigator.git
   cd cash-flow-navigator
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and configure your Supabase variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   bun run dev
   # or
   npm run dev
   ```

5. Build for production:
   ```bash
   bun run build
   # or
   npm run build
   ```

## License

This project is open-source and available under the MIT License.
