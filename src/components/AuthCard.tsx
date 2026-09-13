export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="authOverlay">
      <div className="authCard">
        <div className="authLogoBox">
          <img src="/aliframe-logo-full.svg" alt="Ali-Frame Windows & Doors" />
        </div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
