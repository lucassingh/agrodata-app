import { Sprout } from "lucide-react";
import { ACTIVITIES } from "./content";

/** Única franja en movimiento de la página: rubros y actividades que cubre AgroData. */
export function ActivitiesMarquee() {
  const items = [...ACTIVITIES, ...ACTIVITIES];
  return (
    <section aria-label="Rubros y actividades que cubre AgroData" className="border-y border-l-line bg-l-surface py-6">
      <ul className="sr-only">
        {ACTIVITIES.map((activity) => (
          <li key={activity}>{activity}</li>
        ))}
      </ul>
      <div
        aria-hidden
        className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
      >
        <div className="landing-marquee-track flex w-max items-center gap-10">
          {items.map((activity, index) => (
            <span key={index} className="flex items-center gap-10 font-heading text-xl font-semibold tracking-[-0.01em] text-l-ink/80">
              {activity}
              <Sprout className="size-5 text-l-brand-light" strokeWidth={1.75} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
