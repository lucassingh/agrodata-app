import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/components/landing/content";
import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones | AgroData",
  description: "Las condiciones de uso de AgroData: el asistente por WhatsApp y el dashboard web.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Estas condiciones regulan el uso de AgroData: el asistente por WhatsApp y el dashboard web. Al crear una cuenta o mandar mensajes al asistente, las aceptás."
    >
      <LegalSection title="1. El servicio">
        <p>
          AgroData, prestado por {LEGAL.responsible}, permite registrar la información de un establecimiento
          agropecuario enviando mensajes de texto, notas de voz o fotos por WhatsApp, y consultarla y administrarla desde
          un dashboard web.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuentas y roles">
        <ul>
          <li>Tenés que ser mayor de edad y dar datos verdaderos al registrarte.</li>
          <li>
            Sos responsable de cuidar tu contraseña y el acceso a tu WhatsApp: lo que se cargue desde tu cuenta o tu
            número se considera hecho por vos.
          </li>
          <li>
            Quien administra un campo decide a quién invita y con qué rol, y es responsable de contar con el
            consentimiento de esas personas para que sus mensajes se procesen.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Inteligencia artificial">
        <p>
          Los mensajes se interpretan con inteligencia artificial. Puede equivocarse: leer mal un monto, un potrero o una
          cantidad. Por eso el asistente confirma lo que carga y pregunta antes de crear algo nuevo. Revisá la
          información importante en el dashboard antes de tomar decisiones con ella; cada registro se puede editar o
          borrar.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso aceptable">
        <p>No se puede usar AgroData para:</p>
        <ul>
          <li>cargar información de terceros sin autorización o con fines ilícitos;</li>
          <li>intentar acceder a datos de otros campos o vulnerar la seguridad del servicio;</li>
          <li>enviar contenido masivo, automatizado o que no tenga que ver con la gestión del campo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Tus datos">
        <p>
          La información que cargás es tuya. Nos das permiso para tratarla solo en la medida necesaria para prestar el
          servicio, como explica la <Link href="/privacidad">política de privacidad</Link>. Podés pedirnos una copia o que
          la borremos.
        </p>
      </LegalSection>

      <LegalSection title="6. Planes y pagos">
        <p>
          Las condiciones de cada plan (precio, límites y forma de pago) se informan antes de contratar. Podés cancelar
          en cualquier momento; la cancelación rige desde el período siguiente al ya pagado.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidad">
        <p>
          Trabajamos para que el servicio esté siempre disponible, pero puede haber interrupciones por mantenimiento o
          por fallas de proveedores (por ejemplo, WhatsApp). Los mensajes que lleguen durante una interrupción se
          procesan cuando el servicio se restablece.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilidad">
        <p>
          AgroData es una herramienta de registro y consulta: las decisiones productivas, sanitarias, comerciales o
          impositivas que tomes siguen siendo tuyas. En la medida en que la ley lo permita, no respondemos por daños
          indirectos derivados del uso de la información cargada. Nada de esto limita los derechos que te reconoce la
          Ley 24.240 de Defensa del Consumidor.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios y baja">
        <p>
          Podemos actualizar estas condiciones; si el cambio es importante, te avisamos antes de que entre en vigencia.
          Podés dar de baja tu cuenta cuando quieras escribiendo a {LEGAL.contactEmail}. Podemos suspender una cuenta que
          incumpla estas condiciones.
        </p>
      </LegalSection>

      <LegalSection title="10. Ley aplicable">
        <p>Estas condiciones se rigen por las leyes de la República Argentina.</p>
      </LegalSection>
    </LegalPage>
  );
}
