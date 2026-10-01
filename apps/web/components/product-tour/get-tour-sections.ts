import type { TourDefinition } from "./types";

export interface TourSection {
  groupId: string;
  label: string;
}

/** Las secciones (una por grupo) que ofrece el menú «Ver guía», sacadas de
 *  `buildSteps(ctx)`: así se usa el mismo filtro que decide qué grupos existen,
 *  sin una lista paralela que se desincronice. */
export function getTourSections<TCtx>(definition: TourDefinition<TCtx>, ctx: TCtx): TourSection[] {
  const seen = new Set<string>();
  const sections: TourSection[] = [];
  for (const step of definition.buildSteps(ctx)) {
    if (seen.has(step.groupId)) continue;
    seen.add(step.groupId);
    sections.push({ groupId: step.groupId, label: definition.groupLabels[step.groupId] ?? step.groupId });
  }
  return sections;
}
