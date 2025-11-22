// src/pages/map.jsx
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// แก้ปัญหา marker icon ไม่ขึ้นเวลาใช้กับ Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString(),
});

// component ย่อยสำหรับ handle คลิกบนแผนที่
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapPage() {
  // ศูนย์กลางแผนที่ (ตัวอย่าง: กรุงเทพฯ)
  const center = [13.8479838, 100.5697013];

  // รายการพืชที่ลงทะเบียน (ยังไม่ใช้ DB → เก็บใน state)
  const [plants, setPlants] = useState([]);

  // ฟอร์มข้อมูลพืช
  const [form, setForm] = useState({
    name: "",
    species: "",
    lat: "",
    lng: "",
  });

  // อัปเดตฟอร์มเวลาเปลี่ยนค่าใน input
  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // เวลา click บนแผนที่ → set lat/lng ในฟอร์ม
  const handleMapClick = (latlng) => {
    setForm((prev) => ({
      ...prev,
      lat: latlng.lat.toFixed(6),
      lng: latlng.lng.toFixed(6),
    }));
  };

  // ลงทะเบียนพืชใหม่
  const handleRegisterPlant = (e) => {
    e.preventDefault();

    if (!form.name || !form.species || !form.lat || !form.lng) {
      alert("กรุณากรอกชื่อ, พันธุ์ และเลือกตำแหน่งให้ครบก่อน");
      return;
    }

    const newPlant = {
      id: Date.now(),
      name: form.name,
      species: form.species,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
    };

    setPlants((prev) => [...prev, newPlant]);

    // ล้างชื่อ+พันธุ์ แต่ยังคงตำแหน่งไว้ เผื่อจะลงทะเบียนต้นถัดไปที่จุดเดียวกัน
    setForm((prev) => ({
      ...prev,
      name: "",
      species: "",
    }));
  };

  return (
    <div className="p-8 space-y-6 w-full h-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Plant Map</h1>
      <p className="text-gray-500 mb-4">
        Click the map to pick a plant location and fill in the form to register.
      </p>

      {/* แบ่งเป็น 2 คอลัมน์: ฟอร์ม + แผนที่ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฟอร์มลงทะเบียนพืช */}
        <form
          onSubmit={handleRegisterPlant}
          className="bg-white rounded-2xl shadow-md p-5 space-y-4 lg:col-span-1"
        >
          <h2 className="text-sm font-semibold mb-1">
            Register Plant Information 
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              Plant Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="เช่น Plant 01"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              Species
            </label>
            <input
              type="text"
              value={form.species}
              onChange={(e) => handleChange("species", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="เช่น Ficus, Fern, ฯลฯ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={form.lat}
                onChange={(e) => handleChange("lat", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="คลิกแผนที่เพื่อเลือก"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={form.lng}
                onChange={(e) => handleChange("lng", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="คลิกแผนที่เพื่อเลือก"
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            * คลิกบนแผนที่หนึ่งครั้งเพื่อตั้งค่า Latitude/Longitude อัตโนมัติ
          </p>

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Register A Plant
          </button>
        </form>

        {/* แผนที่ */}
        <div className="lg:col-span-2">
          <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-md bg-gray-100">
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

              {/* handle click */}
              <MapClickHandler onMapClick={handleMapClick} />

              {/* marker จากพืชที่ลงทะเบียน */}
              {plants.map((plant) => (
                <Marker
                  key={plant.id}
                  position={[plant.lat, plant.lng]}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">
                        {plant.name}
                      </p>
                      <p className="text-gray-600">
                        Species: {plant.species}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        ({plant.lat.toFixed(5)},{" "}
                        {plant.lng.toFixed(5)})
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* รายการพืชที่ลงทะเบียน */}
      {plants.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl shadow-md p-4">
          <h2 className="text-sm font-semibold mb-2">
            Registered Plants
          </h2>
          <ul className="text-xs space-y-1">
            {plants.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.name}</span>{" "}
                — {p.species} ({p.lat.toFixed(5)},{" "}
                {p.lng.toFixed(5)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MapPage;
