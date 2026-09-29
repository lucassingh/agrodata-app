import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React reconoce el entorno de test y no advierte por actualizaciones de estado
// fuera de act(), que pasan al llamar acciones del store de Zustand directo.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Sin `globals`, Testing Library no desmonta solo entre tests: se hace acá.
afterEach(cleanup);
