import { useState } from "react";
import Sidebar from "./components/sidebar";
import Dashboard from "./pages/dashboard";
import PlantStats from "./pages/PlantStats";
import MapPage from "./pages/map";
import About from "./pages/about";
import PlantDetail from "./pages/PlantDetail";

function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedPlant, setSelectedPlant] = useState(null);

  const handleNavigateToPlant = (plant) => {
    setSelectedPlant(plant);
    setPage("plant-detail");
  };

  const renderContent = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "plant-stats":
        return <PlantStats onNavigateToPlant={handleNavigateToPlant} />;
      case "plant-detail":
        return (
          <PlantDetail
            plant={selectedPlant}
            onBack={() => setPage("plant-stats")}
          />
        );
      case "map":
        return <MapPage />;
      case "about":
        return <About />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar currentPage={page} setPage={setPage} />
      <main className="flex-1 p-10 bg-gray-100 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
