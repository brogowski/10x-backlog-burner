interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-sm text-foreground/70 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
};

export default AuthHeader;
