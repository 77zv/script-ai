import Nav from "@/components/layout/Nav";
import GridOverlay from "@/components/layout/GridOverlay";

export default function Dashboard() {
  return (
    <GridOverlay>
      <Nav />
      <main className="mx-auto flex w-full max-w-4xl flex-col items-center px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="w-full py-12 sm:py-16 lg:py-24">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Dashboard</h1>
          <p className="mt-4 text-sm text-gray-500 sm:text-base">Welcome to your dashboard</p>
        </div>
      </main>
    </GridOverlay>
  );
}
