export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ui-app-main">
      {children}
    </div>
  );
}
