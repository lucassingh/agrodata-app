import { Check, Minus } from "lucide-react";
import { COMPARISON } from "./content";
import { Container, SectionTitle } from "./primitives";

/** AgroData contra una app de registro por WhatsApp, sin nombrar a nadie. */
export function Comparison() {
  return (
    <section id="comparativa" aria-labelledby="comparativa-title" className="scroll-mt-20 bg-l-surface py-28 lg:py-36">
      <Container>
        <div className="landing-reveal max-w-[62ch]">
          <SectionTitle id="comparativa-title" className="max-w-[20ch]">
            {COMPARISON.title}
          </SectionTitle>
          <p className="mt-4 text-lg text-l-ink-soft">{COMPARISON.subtitle}</p>
        </div>

        <div className="landing-reveal mt-12 overflow-hidden rounded-[20px] bg-white shadow-l">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{COMPARISON.subtitle}</caption>
            <thead>
              <tr className="border-b border-l-line">
                <th scope="col" className="px-4 py-5 text-sm font-medium text-l-ink-soft sm:px-8">
                  <span className="sr-only">Función</span>
                </th>
                <th scope="col" className="w-[22%] bg-l-brand-tint px-2 py-5 text-center font-heading text-sm font-semibold text-l-brand-dark sm:w-[20%] sm:text-base">
                  {COMPARISON.columns.us}
                </th>
                <th scope="col" className="w-[22%] px-2 py-5 text-center text-sm font-medium text-l-ink-soft sm:w-[20%] sm:text-base">
                  {COMPARISON.columns.them}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.rows.map((row) => (
                <tr key={row.label} className="border-b border-l-line last:border-b-0">
                  <th scope="row" className="px-4 py-4 text-[15px] font-medium text-l-ink sm:px-8 sm:text-base">
                    {row.label}
                  </th>
                  <td className="bg-l-brand-tint/60 px-2 py-4 text-center">
                    <Check className="mx-auto size-5 text-l-brand" aria-hidden />
                    <span className="sr-only">Sí</span>
                  </td>
                  <td className="px-2 py-4 text-center">
                    {row.them ? (
                      <Check className="mx-auto size-5 text-l-ink-soft" aria-hidden />
                    ) : (
                      <Minus className="mx-auto size-5 text-l-ink-soft" aria-hidden />
                    )}
                    <span className="sr-only">{row.them ? "Sí" : "No"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
