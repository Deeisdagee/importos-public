# ImportOS

A static, bilingual workspace for comparing illustrative supplier quotes and estimating shipment cash costs. Both tools share one interface, one language control, a currency selector and the same visual style.

## Run and host

Serve the `public/` directory as the site root. There is no build step, dependency installation or application backend. The browser requests public reference exchange rates from Frankfurter for currency conversion.

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

## Currencies and exchange rates

The shared selector supports Saudi riyals (`SAR`), US dollars (`USD`, `$`), euros (`EUR`, `€`), pounds sterling (`GBP`, `£`), Chinese yuan (`CNY`, `CN¥`), Indian rupees (`INR`, `₹`) and Japanese yen (`JPY`, `JP¥`). The official Saudi riyal artwork is rendered locally as a symbol; its provenance is documented in [`public/assets/README.md`](public/assets/README.md).

Selecting a currency instantly converts monetary inputs, results, comparison amounts and monetary explanations across both tools. The language and currency selections are independent. Quantities, deadlines and percentage rates do not change. All monetary fields use the one selected currency; entering different currencies in individual fields is not supported.

Conversions use a dated snapshot of [Frankfurter reference rates](https://frankfurter.dev/), not live market ticks or a bank's executable quote. The page shows the reference date and the rate against SAR. The browser requests USD-based rates and calculates cross-rates as `amount × rate[to] ÷ rate[from]`:

```text
https://api.frankfurter.dev/v2/rates?base=USD&quotes=SAR,EUR,GBP,CNY,INR,JPY
```

Rates load once when the page opens and when the user selects **Refresh exchange rates**. There is no automatic refresh during data entry. No API key or credentials are required. Reference rates do not determine official customs or tax bases, and do not include bank fees or exchange spreads. See [Frankfurter's methodology](https://frankfurter.dev/methodology/) for source and date semantics.

### Preserving values and handling failures

- The calculator retains unrounded canonical SAR values. Switching currency or language does not repeatedly convert rounded display values or reset review status. Editing a monetary field converts that new value from the selected currency back to SAR.
- Refreshing rates preserves the underlying SAR values and redisplays their equivalents in the selected foreign currency. Foreign displayed amounts can therefore change when the reference rates change.
- Converted inputs normally show at most six decimal places; tiny nonzero amounts remain visible using significant digits instead of becoming zero. The full internal canonical value is retained until the user edits the field. Result amounts follow the selected currency's precision: zero decimal places for JPY, two for the other supported currencies.
- A failed initial request leaves SAR calculations available and foreign switching unavailable. A failed refresh retains the previous valid snapshot and visibly reports its reference date and update failure; it does not replace rates with sample figures.
- New snapshots with invalid, future or more than seven-day-old dates are rejected. Once a retained snapshot ages beyond seven days, new switches to a foreign currency are refused until valid rates are loaded. Returning to SAR remains possible.
- Invalid monetary inputs or an out-of-range conversion block a currency/rate change rather than partially converting the form.

## Calculation scope

The calculator uses the amounts entered by the user:

```text
Duty = entered duty base × entered duty rate ÷ 100
Tax = entered tax base × entered tax rate ÷ 100
Total = goods + freight + insurance + duty + tax + other entered costs
Per unit = total ÷ unit count
```

Duty and tax bases remain independent, manual values. The app never derives them automatically from shipment amounts. Changes to goods, freight or insurance prompt review of both bases; changes to the duty base or rate prompt review of the tax base. Users can calculate with unreviewed bases, but the result is labeled provisional until review is acknowledged. Acknowledgment records the user's review; it is not official verification.

Calculations retain precision internally; displayed results use the selected currency's decimal precision. Negative or nonfinite values, invalid unit counts, rates above 100% and arithmetic overflow are rejected.

### Reference examples

All examples use 100 units, goods of SAR 10,000, insurance of SAR 100, other costs of SAR 400, a 5% duty rate and a 15% tax rate. These rates and bases are fictional assumptions, not official rates for a real shipment.

| Example | Freight | Duty base | Tax base | Total | Displayed cost per unit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 1,000 | 11,100 | 11,655 | 13,803.25 | 138.03 |
| Higher freight, original bases retained | 1,500 | 11,100 | 11,655 | 14,303.25 | 143.03 |
| Prepared higher-freight scenario | 1,500 | 11,600 | 12,180 | 14,407.00 | 144.07 |

The supplier comparison is a separate, fixed fictional example for 1,000 identical units. It compares stated goods, freight and other stated fees, with 20-day or 35-day deadlines and an optional SAR 500 freight increase for Supplier B. Duty, tax, insurance and all unstated charges are excluded from those comparison totals; missing costs are not treated as zero. The comparison does not verify supplier quality or reliability.

## Privacy

Inputs, scenario choices and exchange-rate snapshots remain in page memory. The app has no accounts, analytics, cookies, local storage or shipment-submission backend. Reloading resets shipment inputs, the comparison scenario and currency to their defaults; the language can remain selected through the URL.

The browser sends a public exchange-rate request to `api.frankfurter.dev` on initial load and when the user requests a refresh. It sends only the fixed currency-pair query, with credentials omitted and no referrer; shipment values, quantities, calculated totals and review state are not included. The FX service and hosting provider necessarily receive ordinary connection metadata and may process it under their own policies. Other official external links open only when selected by the user.

## Verification

Run the local test suite with Node.js:

```sh
node --test tests/*.test.cjs
```

The suite covers pure calculations and controller integration using a simulated DOM, including review reminders, language changes, routes and preserved tool state. Currency verification also needs to cover cross-rates, reference dates, precision, request failures and switching currencies without losing canonical values or review state. These are not Chromium, Safari or visual-layout tests. Separate browser checks assess rendering and interactions after currency and language changes, keyboard focus, reduced motion and narrow-screen behavior in Arabic and English.
