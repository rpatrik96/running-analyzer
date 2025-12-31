# Running Dynamics Analyzer

A modern web application for analyzing running form metrics from Garmin and Stryd FIT files. Get detailed insights into your running dynamics including ground contact time, vertical oscillation, cadence, and power metrics.

## Features

### FIT File Parser
- Parses binary Garmin/Stryd FIT format directly in the browser
- Extracts all standard running dynamics fields:
  - Ground Contact Time (GCT)
  - Vertical Oscillation (VO)
  - Cadence
  - Step Length
  - Vertical Ratio
  - L/R Balance
- Full Stryd developer field support:
  - Running Power
  - Form Power
  - Leg Spring Stiffness (LSS)
  - Air Power
  - Impact Loading Rate

### Analysis Tabs

#### Summary
- Key metrics with mean and standard deviation
- Color-coded targets (green when hitting goals like GCT <240ms, VR <6%)
- L/R balance visualization
- Metrics-by-pace table for analyzing form at different speeds

#### Charts
- GCT over distance (fatigue tracking)
- GCT vs Speed scatter plot with correlation
- Step Length vs Speed scatter plot
- Cadence vs Speed scatter plot
- Vertical Ratio over distance (efficiency tracking)
- Power over distance (with Stryd data)
- Heart Rate over distance

#### Correlations
- All key metric correlations with strength indicators
- Interpretation guide for understanding your running style
- Power correlations (with Stryd data)

#### Splits
- First quarter vs last quarter comparison
- Fatigue resistance analysis with status indicators
- Detailed explanations of fatigue impact

## Getting Started

### Prerequisites
- Node.js 18 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/running-analyzer.git
cd running-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. Open the app in your browser
2. Click the upload area or drag and drop a `.fit` file
3. Explore the analysis tabs:
   - **Summary**: Overview of your running metrics
   - **Charts**: Visual analysis of metrics over time
   - **Correlations**: Relationships between different metrics
   - **Splits**: Fatigue analysis comparing start vs end

## Supported Metrics

### Garmin Running Dynamics
| Metric | Description | Target |
|--------|-------------|--------|
| Ground Contact Time (GCT) | Time foot is on ground per step | <240ms |
| Vertical Oscillation (VO) | Vertical bounce per step | <6cm |
| Cadence | Steps per minute | >180spm |
| Step Length | Distance per step | Varies |
| Vertical Ratio | VO/Step Length | <6% |
| GCT Balance | L/R ground contact balance | 50/50 |

### Stryd Power Metrics
| Metric | Description | Notes |
|--------|-------------|-------|
| Running Power | Total power output | Watts |
| Form Power | Power used maintaining form | <80W ideal |
| Leg Spring Stiffness | Elastic energy return | >9 kN/m ideal |
| Air Power | Power to overcome air resistance | Increases with speed |
| Impact Loading Rate | Force absorption rate | BW/s |

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **FIT Parsing**: Custom browser-based parser

## Project Structure

```
running-analyzer/
├── src/
│   ├── components/
│   │   ├── tabs/
│   │   │   ├── SummaryTab.tsx
│   │   │   ├── ChartsTab.tsx
│   │   │   ├── CorrelationsTab.tsx
│   │   │   └── SplitsTab.tsx
│   │   ├── MetricCard.tsx
│   │   ├── CorrelationBadge.tsx
│   │   ├── FileUpload.tsx
│   │   └── BalanceIndicator.tsx
│   ├── lib/
│   │   ├── fit-parser.ts      # FIT file parser
│   │   ├── data-processor.ts  # Data processing
│   │   └── statistics.ts      # Statistical functions
│   ├── types/
│   │   └── fit.ts             # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Known Limitations

1. **Developer Fields**: The browser-based FIT parser handles core Stryd fields through pattern matching. Some firmware-specific developer fields may not be recognized. For full Stryd metrics:
   - Pre-process with `fitparse` (Python) and export to JSON
   - Use Stryd's PowerCenter export

2. **Large Files**: Very large FIT files (>100MB) may cause browser performance issues.

3. **Non-Running Activities**: This analyzer is designed for running activities. Cycling, swimming, or other activities will not parse correctly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
