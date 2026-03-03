export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="pt-28">{children}</main>;
}
