import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/components/landing/content";
import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad | AgroData",
  description: "Qué datos trata AgroData, para qué, con quién los comparte y cómo ejercer tus derechos.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="AgroData es un asistente que convierte los mensajes de WhatsApp de tu equipo en registros del campo. Para hacerlo necesitamos tratar algunos datos personales. Acá explicamos cuáles, para qué y qué podés hacer con ellos."
    >
      <LegalSection title="1. Quién es el responsable">
        <p>
          El responsable del tratamiento de los datos es {LEGAL.responsible}. Podés escribirnos por cualquier consulta
          sobre privacidad a {LEGAL.contactEmail}.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos tratamos">
        <ul>
          <li>
            <strong>Datos de cuenta:</strong> nombre, email, número de WhatsApp, contraseña (guardada cifrada, nunca en
            texto plano) y el rol que tenés en cada campo.
          </li>
          <li>
            <strong>Mensajes de WhatsApp enviados a AgroData:</strong> texto, notas de voz y fotos (por ejemplo, de
            facturas), junto con el número que los envía y la fecha.
          </li>
          <li>
            <strong>Datos del campo:</strong> potreros, cultivos, animales, insumos, gastos, tareas y registros que se
            cargan desde WhatsApp o desde el dashboard.
          </li>
          <li>
            <strong>Datos técnicos:</strong> registros de acceso y de errores necesarios para operar y proteger el
            servicio.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para qué los usamos">
        <ul>
          <li>Crear y administrar tu cuenta, y validar tu identidad (incluido el código de verificación por WhatsApp).</li>
          <li>
            Interpretar los mensajes que mandás y convertirlos en registros del campo (gastos, stock, siembras,
            movimientos de animales, tareas), y responderte por WhatsApp.
          </li>
          <li>Mostrarte indicadores y reportes en el dashboard.</li>
          <li>Mantener la seguridad del servicio, detectar errores y mejorarlo.</li>
        </ul>
        <p>
          No vendemos tus datos ni los usamos para publicidad. Los datos de tu campo son tuyos: no los usamos para
          entrenar modelos de inteligencia artificial.
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién los compartimos">
        <p>
          Para prestar el servicio trabajamos con proveedores que tratan datos por cuenta nuestra y solo para ese fin:
        </p>
        <ul>
          <li>
            <strong>Meta (WhatsApp Business Platform):</strong> recibe y entrega los mensajes.
          </li>
          <li>
            <strong>Anthropic:</strong> interpreta el contenido de los mensajes y las fotos con inteligencia artificial.
          </li>
          <li>
            <strong>OpenAI:</strong> transcribe las notas de voz a texto.
          </li>
          <li>
            <strong>Vercel, Neon e Inngest:</strong> alojan la aplicación, la base de datos y el procesamiento de los
            mensajes.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores procesan datos fuera de la Argentina (principalmente en los Estados Unidos). Solo
          trabajamos con proveedores que ofrecen garantías adecuadas de protección. Dentro de un campo, los datos
          cargados son visibles para las personas que el administrador de ese campo invitó, según su rol.
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo los guardamos">
        <p>
          Guardamos los datos mientras tu cuenta esté activa. Si pedís la baja, borramos tus datos personales y los del
          campo que administrás dentro de los 30 días, salvo lo que la ley nos obligue a conservar por más tiempo.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus datos personales escribiendo a{" "}
          {LEGAL.contactEmail}. El acceso es gratuito si lo pedís con intervalos de al menos seis meses, salvo que
          acredites un interés legítimo (artículo 14, inciso 3, de la Ley 25.326). Parte de tus datos los podés corregir
          vos mismo desde el dashboard.
        </p>
        <p>
          La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene
          la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos
          por incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection title="7. Cómo borrar tus datos">
        <p>
          Escribinos a {LEGAL.contactEmail} desde el email de tu cuenta pidiendo la baja. Confirmamos la solicitud y
          completamos el borrado dentro de los 30 días.
        </p>
      </LegalSection>

      <LegalSection title="8. Seguridad">
        <p>
          Usamos conexiones cifradas, contraseñas cifradas y verificamos la firma de cada mensaje que llega desde
          WhatsApp. Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te vamos a avisar.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios en esta política">
        <p>
          Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, te avisamos por
          email o WhatsApp. También podés leer los <Link href="/terminos">términos y condiciones</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
