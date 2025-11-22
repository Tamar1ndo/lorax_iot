// src/pages/map.jsx
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapPage() {
  // จุดกึ่งกลางแผนที่ (ตัวอย่าง: กรุงเทพฯ)
  const center = [13.7563, 100.5018]; // [lat, lng]

  return (
    <div className="p-8 space-y-4 w-full h-full">
      <h1 className="text-xl font-semibold">Plant Map</h1>
      <p className="text-xs text-gray-500">
        แผนที่สำหรับดูตำแหน่งพืช (ตอนนี้ยังเป็นแผนที่เปล่า ๆ ก่อน)
      </p>

      {/* กล่องแผนที่ */}
      <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-md bg-gray-100">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPage;
