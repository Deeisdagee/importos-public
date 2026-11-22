# ImportOS

A static, bilingual workspace for comparing illustrative supplier quotes and estimating shipment cash costs. Both tools share one interface, one language control and the same visual style.

## Run and host

Serve the `public/` directory as the site root. There is no build step, dependency installation or backend.

For a local development server:

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000/` in a browser. JavaScript is required for the interactive tools.

## Navigation and language

- `/` and `/#compare` open the comparison tool.
- `/#calculator` opens the shipment calculator. Existing `#estimate` and `#example` links also select the calculator.
- `?lang=en` selects English; Arabic is the default. The shared language button updates text and direction across both tools while preserving their current inputs and results.
- Switching tools keeps the current scenario and shipment values. Browser history supports the tool routes.
- Existing `/compare.html` links redirect to the unified `/#compare` route, preserving query parameters such as `lang=en`.
- Small transitions respond to navigation and result changes. The interface respects `prefers-reduced-motion` and supports keyboard navigation between tabs.

## Calculation scope

The calculator uses the amounts entered by the user:

```text
Duty = entered duty base × entered duty rate ÷ 100
Tax = entered tax base × entered tax rate ÷ 100
Total = goods + freight + insurance + duty + tax + other entered costs
Per unit = total ÷ unit count
```

Duty and tax bases remain independent, manual values. The app never derives them automatically from shipment amounts. Changes to goods, freight or insurance prompt review of both bases; changes to the duty base or rate prompt review of the tax base. Users can calculate with unreviewed bases, but the result is labeled provisional until review is acknowledged. Acknowledgment records the user's review; it is not official verification.

Calculations retain precision internally and display two decimal places. Negative or nonfinite values, invalid unit counts, rates above 100% and arithmetic overflow are rejected.

### Reference examples

All examples use 100 units, goods of SAR 10,000, insurance of SAR 100, other costs of SAR 400, a 5% duty rate and a 15% tax rate. These rates and bases are fictional assumptions, not official rates for a real shipment.

| Example | Freight | Duty base | Tax base | Total | Displayed cost per unit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 1,000 | 11,100 | 11,655 | 13,803.25 | 138.03 |
| Higher freight, original bases retained | 1,500 | 11,100 | 11,655 | 14,303.25 | 143.03 |
| Prepared higher-freight scenario | 1,500 | 11,600 | 12,180 | 14,407.00 | 144.07 |

The supplier comparison is a separate, fixed fictional example for 1,000 identical units. It compares stated goods, freight and other stated fees, with 20-day or 35-day deadlines and an optional SAR 500 freight increase for Supplier B. Duty, tax, insurance and all unstated charges are excluded from those comparison totals; missing costs are not treated as zero. The comparison does not verify supplier quality or reliability.

## Privacy

Inputs and scenario choices remain in page memory. The app has no accounts, analytics, cookies, local storage or submission backend. Reloading resets the shipment inputs and comparison scenario to the examples; the language can remain selected through the URL. The hosting provider may process standard connection logs. Official external links open only when selected by the user.

## Verification

Run the local test suite with Node.js:

```sh
node --test tests/*.test.cjs
```

The suite covers pure calculations and controller integration using a simulated DOM, including review reminders, language changes, routes and preserved tool state. These are not Chromium, Safari or visual-layout tests. Browser checks separately assess rendering, interaction, keyboard focus, reduced motion and narrow-screen behavior in Arabic and English.
