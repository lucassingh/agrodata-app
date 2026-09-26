import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FieldReport } from "@repo/core/reports/field-report.service";

/** Informe del asesor para un campo (Etapa 4). Solo servidor: lo renderiza la ruta
 *  /dashboard/report con `renderToBuffer`. Tipografía Helvetica del PDF (cubre
 *  acentos y eñes sin descargar fuentes). */

const GREEN = "#2D6A4F";
const INK = "#1F2A24";
const MUTED = "#5F6B64";
const LINE = "#D9E2DC";
const RED = "#B3261E";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica" },
  brand: { fontSize: 9, color: GREEN, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 6 },
  subtitle: { fontSize: 10.5, color: MUTED, marginTop: 3 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, paddingVertical: 8, borderTop: `1 solid ${LINE}`, borderBottom: `1 solid ${LINE}` },
  metaItem: { width: "50%", marginVertical: 2 },
  metaLabel: { color: MUTED },
  section: { marginTop: 18 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 6 },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: { flexGrow: 1, flexBasis: 0, padding: 8, border: `1 solid ${LINE}`, borderRadius: 4 },
  kpiLabel: { fontSize: 8, color: MUTED },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  row: { flexDirection: "row", borderBottom: `0.5 solid ${LINE}`, paddingVertical: 4 },
  headRow: { flexDirection: "row", borderBottom: `1 solid ${INK}`, paddingBottom: 3 },
  head: { fontFamily: "Helvetica-Bold", fontSize: 8, color: MUTED, textTransform: "uppercase" },
  cell: { flexGrow: 1, flexBasis: 0 },
  num: { textAlign: "right" },
  note: { fontSize: 8, color: MUTED, marginTop: 4 },
  empty: { color: MUTED },
  comment: { padding: 10, backgroundColor: "#F3F7F4", borderRadius: 4, lineHeight: 1.3 },
  signature: { marginTop: 36, width: 220, borderTop: `1 solid ${INK}`, paddingTop: 5 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED },
});

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const ars = (value: number | null, digits = 0) => (value === null ? "—" : `$ ${number(value, digits)}`);
const usd = (value: number | null) => (value === null ? "—" : `US$ ${number(value)}`);
const orDash = (value: number | null, format: (v: number) => string) => (value === null ? "—" : format(value));
const day = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

const CAMPAIGN_STATUS: Record<string, string> = { IN_PROGRESS: "En curso", HARVESTED: "Cosechada", CLOSED: "Cerrada" };

function Table({ columns, rows }: { columns: { label: string; width?: number; num?: boolean }[]; rows: string[][] }) {
  const style = (c: { width?: number; num?: boolean }) => [s.cell, c.width ? { flexGrow: c.width } : {}, c.num ? s.num : {}];
  return (
    <View>
      <View style={s.headRow}>
        {columns.map((c) => (
          <Text key={c.label} style={[...style(c), s.head]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={s.row} wrap={false}>
          {row.map((value, j) => (
            <Text key={j} style={style(columns[j]!)}>
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
    </View>
  );
}

export function FieldReportDocument({ report, comment, issuedOn }: { report: FieldReport; comment: string; issuedOn: string }) {
  const { field, author, period, expenses, economy, livestock, dairy } = report;
  const signatureLine = [author.profession, author.licenseNumber].filter(Boolean).join(" · ");

  return (
    <Document title={`Informe ${field.name} — ${period.label}`} author={author.fullName} creator="AgroData">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>AGRODATA · INFORME DE CAMPO</Text>
        <Text style={s.title}>{field.name}</Text>
        <Text style={s.subtitle}>Informe de {period.label}</Text>

        <View style={s.meta}>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>Período: </Text>
            {day(period.from)} al {day(period.to)}
          </Text>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>Actividades: </Text>
            {field.activities}
          </Text>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>Dueño: </Text>
            {field.owner ?? "—"}
          </Text>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>Preparado por: </Text>
            {author.fullName}
            {author.profession ? `, ${author.profession}` : ""}
          </Text>
          {field.location ? (
            <Text style={s.metaItem}>
              <Text style={s.metaLabel}>Ubicación: </Text>
              {field.location}
            </Text>
          ) : null}
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>Emitido: </Text>
            {day(issuedOn)}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Actividad del período</Text>
          <View style={s.kpis}>
            <Kpi label="Gastos en pesos" value={ars(expenses.totalArs)} />
            <Kpi label="Gastos en dólares" value={usd(expenses.totalUsd)} />
            <Kpi label="Registros cargados" value={number(report.activity.records)} />
            <Kpi label="Tareas completadas" value={number(report.activity.tasksDone)} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Gastos por categoría</Text>
          {expenses.rows.length === 0 ? (
            <Text style={s.empty}>Sin gastos en el período.</Text>
          ) : (
            <Table
              columns={[{ label: "Categoría", width: 3 }, { label: "Comprobantes", num: true }, { label: "Monto", width: 1.5, num: true }]}
              rows={expenses.rows.map((e) => [
                e.category,
                number(e.count),
                e.currency === "USD" ? usd(e.amount) : ars(e.amount),
              ])}
            />
          )}
          <Text style={s.note}>Pesos y dólares se informan por separado, sin convertir.</Text>
        </View>

        {economy ? (
          <View style={s.section}>
            <Text style={s.h2}>Economía por lote · campaña {period.season}</Text>
            {economy.campaigns.length === 0 ? (
              <Text style={s.empty}>Sin campañas en este ciclo.</Text>
            ) : (
              <Table
                columns={[
                  { label: "Cultivo y lote", width: 2.6 },
                  { label: "Estado" },
                  { label: "Ha", num: true },
                  { label: "Costo/ha", num: true },
                  { label: "Rinde kg/ha", num: true },
                  { label: "Margen/ha", num: true },
                ]}
                rows={economy.campaigns.map((c) => [
                  c.name,
                  CAMPAIGN_STATUS[c.status] ?? c.status,
                  orDash(c.hectares, (v) => number(v, 1)),
                  usd(c.costPerHaUsd),
                  orDash(c.yieldKgHa, (v) => number(v)),
                  usd(c.marginPerHaUsd),
                ])}
              />
            )}
            <Text style={s.note}>
              Margen bruto en dólares ({economy.rateLabel}, cotización de la fecha de cada movimiento). Costos{" "}
              {field.vatCondition === "MONOTRIBUTISTA" ? "con IVA (monotributista)" : "sin IVA (responsable inscripto)"}.
            </Text>
          </View>
        ) : null}

        {livestock ? (
          <View style={s.section}>
            <Text style={s.h2}>Ganadería · pesadas</Text>
            {livestock.length === 0 ? (
              <Text style={s.empty}>Sin pesadas registradas.</Text>
            ) : (
              <Table
                columns={[
                  { label: "Grupo", width: 2.6 },
                  { label: "Última pesada" },
                  { label: "Cabezas", num: true },
                  { label: "Peso prom.", num: true },
                  { label: "ADPV", num: true },
                  { label: "Kg vivos/ha", num: true },
                ]}
                rows={livestock.map((g) => [
                  g.name,
                  day(g.lastDay),
                  orDash(g.headCount, (v) => number(v)),
                  orDash(g.averageKg, (v) => `${number(v)} kg`),
                  orDash(g.adpv, (v) => `${number(v, 2)} kg/día`),
                  orDash(g.liveKgPerHa, (v) => number(v)),
                ])}
              />
            )}
          </View>
        ) : null}

        {dairy ? (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>Tambo</Text>
            {dairy.days === 0 ? (
              <Text style={s.empty}>Sin litros cargados en el período.</Text>
            ) : (
              <>
                <View style={s.kpis}>
                  <Kpi label="Litros del período" value={number(dairy.liters)} />
                  <Kpi label="Litros por vaca por día" value={orDash(dairy.litersPerCowDay, (v) => number(v, 1))} />
                  <Kpi label="Precio por litro" value={ars(dairy.incomePerLiter, 2)} />
                  <Kpi label="Margen s/ alimentación" value={dairy.marginPerLiter === null ? "—" : `${ars(dairy.marginPerLiter, 2)}/L`} />
                </View>
                <Text style={s.note}>
                  Alimento: {dairy.feedCostPerLiter === null ? "—" : `${ars(dairy.feedCostPerLiter, 2)} por litro`}.
                  {dairy.priceIsReference ? " Precio de la última liquidación anterior (sin liquidaciones en el período)." : ""}
                </Text>
              </>
            )}
          </View>
        ) : null}

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Para tener en cuenta</Text>
          {report.sanitaryDue.length === 0 && report.lowStock.length === 0 ? (
            <Text style={s.empty}>Sin sanidad por vencer ni insumos con stock bajo.</Text>
          ) : null}
          {report.sanitaryDue.map((t, i) => (
            <Text key={`s${i}`} style={t.deadline < period.to ? { color: RED } : undefined}>
              • Sanidad: {t.title}, vence el {day(t.deadline)}
              {t.deadline < period.to ? " (vencida)" : ""}
            </Text>
          ))}
          {report.lowStock.map((st, i) => (
            <Text key={`l${i}`}>
              • Stock bajo: {st.name}, quedan {number(st.quantity, 1)} {st.unit ?? ""}
            </Text>
          ))}
        </View>

        {comment.trim() ? (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>Comentario</Text>
            <Text style={s.comment}>{comment.trim()}</Text>
          </View>
        ) : null}

        <View style={s.signature} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{author.fullName}</Text>
          {signatureLine ? <Text style={{ color: MUTED }}>{signatureLine}</Text> : null}
          <Text style={{ color: MUTED }}>{author.role} de {field.name}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Generado con AgroData a partir de los datos cargados del campo.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
