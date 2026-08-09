import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[60%_40%]">
      <div className="relative hidden overflow-hidden md:block">
        <Image
          src="/brand/bg-login.jpg"
          alt=""
          fill
          priority
          sizes="60vw"
          className="animate-field-zoom object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(140deg, rgba(27,67,50,0.6) 0%, rgba(45,106,79,0.32) 52%, rgba(82,183,136,0.18) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-10 text-white">
          <h2 className="max-w-md font-heading text-2xl font-bold">
            AgroData Intelligence
          </h2>
          <p className="max-w-md text-sm text-white/90">
            Gestioná campos y tambos con datos en tiempo real, IA y
            trazabilidad profesional.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 p-6 sm:p-10">
        <Image
          src="/brand/logo.png"
          alt="AgroData"
          width={220}
          height={49}
          className="h-auto w-[190px]"
          priority
        />
        {children}
      </div>
    </div>
  );
}
