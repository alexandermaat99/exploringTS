export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto pt-16 sm:pt-24 px-4">
        {children}
      </div>
    </div>
  );
}
