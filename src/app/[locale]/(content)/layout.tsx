export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pt-[calc(var(--ui-navigation-height)+var(--spacing-12-value))]">
      {children}
    </div>
  );
}
