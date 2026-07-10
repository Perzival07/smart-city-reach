import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { MapPin, Image as ImageIcon, X, CheckCircle2, Mic, AlertTriangle, HelpCircle, ChevronDown, Recycle } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { SelectField } from "@/components/portal/SelectField";
import { TextareaField } from "@/components/portal/TextareaField";
import { Button } from "@/components/portal/Button";
import { Card } from "@/components/portal/Card";
import { apiFetch } from "@/lib/api";
import { hasErrors, validateFields, validators } from "@/utils/helpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/citizen/new")({
  component: NewReport,
});

const categories = ["overflow", "litter", "illegal_dump", "missed_pickup", "hazard", "other"];
const priorities = ["low", "medium", "high", "urgent"];

// FAQ database
const faqs = [
  { q: "What should I report?", a: "Litter, garbage bins overflowing, illegal waste dumping, missed trash pickups, or toxic hazards." },
  { q: "How does AI validation work?", a: "Once you upload an image, our server-side SAM 2 & GroundingDINO model detects waste categories and highlights the objects for crew verification." },
  { q: "Can I report anonymously?", a: "All reports are linked to your profile to ensure tracking, but your contact details are kept private from other users." }
];

function NewReport() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  
  // Production Feature: Offline status tracking
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Dictation simulation state
  const [dictating, setDictating] = useState(false);

  // Hubs map toggle
  const [showRecycleHubs, setShowRecycleHubs] = useState(false);
  const recycleLayersRef = useRef<L.LayerGroup | null>(null);

  const [values, setValues] = useState({
    category: "overflow",
    priority: "medium",
    description: "",
    address: "",
    latitude: "12.9716",
    longitude: "77.5946",
    block: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Production Feature: Draft Autosave (Load on mount)
  useEffect(() => {
    const saved = localStorage.getItem("clean_city_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setValues((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Production Feature: Draft Autosave (Save on change)
  useEffect(() => {
    localStorage.setItem("clean_city_draft", JSON.stringify({
      category: values.category,
      priority: values.priority,
      description: values.description,
      address: values.address,
      latitude: values.latitude,
      longitude: values.longitude,
      block: values.block
    }));
  }, [values]);

  const set = (key: string) => (e: any) => {
    const val = e.target.value;
    setValues((v) => ({ ...v, [key]: val }));
    if (errors[key]) setErrors((err) => ({ ...err, [key]: "" }));
  };

  const geocodeAddress = async () => {
    if (!values.address.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(values.address)}`);
      const data = await res.json();
      if (data && data[0]) {
        const { lat, lon } = data[0];
        setValues((v) => ({ ...v, latitude: lat, longitude: lon }));
        if (leafletMap.current) {
          leafletMap.current.setView([Number(lat), Number(lon)], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([Number(lat), Number(lon)]);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeocoding(false);
    }
  };

  const detect = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setValues((v) => ({
          ...v,
          latitude: String(latitude),
          longitude: String(longitude),
        }));
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          }
        }
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 5000 }
    );
  };

  // Mock speech dictation
  const triggerDictation = () => {
    if (dictating) return;
    setDictating(true);
    setTimeout(() => {
      setValues((v) => ({
        ...v,
        description: v.description + (v.description ? " " : "") + "[Large pile of trash blockaded on the pedestrian footpath]"
      }));
      setDictating(false);
    }, 2000);
  };

  // Setup Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });

    const initialLat = Number(values.latitude) || 12.9716;
    const initialLng = Number(values.longitude) || 77.5946;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);
    leafletMap.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setValues((v) => ({
        ...v,
        latitude: String(pos.lat),
        longitude: String(pos.lng),
      }));
    });

    // Create a LayerGroup for recycling hubs
    recycleLayersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Render recycling hubs overlay
  useEffect(() => {
    if (!leafletMap.current || !recycleLayersRef.current) return;
    
    // Clear old hubs
    recycleLayersRef.current.clearLayers();

    if (showRecycleHubs) {
      const centerLat = Number(values.latitude) || 12.9716;
      const centerLng = Number(values.longitude) || 77.5946;

      const hubs = [
        { name: "Ward 4 E-Waste Depot", lat: centerLat + 0.003, lng: centerLng - 0.002, color: "#ef4444" },
        { name: "Eco plastics Recycling Bin", lat: centerLat - 0.004, lng: centerLng + 0.003, color: "#3b82f6" },
        { name: "Glass Bottles Center", lat: centerLat + 0.002, lng: centerLng + 0.004, color: "#10b981" }
      ];

      hubs.forEach((h) => {
        const circle = L.circle([h.lat, h.lng], {
          color: h.color,
          fillColor: h.color,
          fillOpacity: 0.5,
          radius: 40
        }).addTo(recycleLayersRef.current!);
        
        circle.bindPopup(`<b>${h.name}</b><br/>Drop off item directly to recycle.`);
      });
    }
  }, [showRecycleHubs, values.latitude, values.longitude]);

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files).slice(0, 4));
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rules = {
      description: [validators.required],
      latitude: [validators.required],
      longitude: [validators.required],
    };
    const errs = validateFields(values, rules);
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }

    setSubmitError("");
    const formData = new FormData();
    formData.append("category", values.category);
    formData.append("priority", values.priority);
    formData.append("message_text", values.description);
    formData.append("address", values.address);
    formData.append("block", values.block);
    formData.append("latitude", values.latitude);
    formData.append("longitude", values.longitude);
    
    // Append tags
    formData.append("tags", `${values.category},${values.priority}`);

    photos.forEach((p) => {
      formData.append("photo", p);
    });

    try {
      await apiFetch("/reports/", {
        method: "POST",
        body: formData,
      });
      
      // Clear draft on successful submit
      localStorage.removeItem("clean_city_draft");
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to post report.");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-up">
        <Card className="p-8 text-center max-w-md w-full border-forest-500">
          <div className="w-16 h-16 rounded-full bg-forest-100 text-forest-700 grid place-items-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="mt-4 font-display font-bold text-2xl">Report submitted</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Your report is in the queue. The background ML scheduler will analyze the photos, verify the waste presence, and notify our collectors.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => { setSuccess(false); setValues((v) => ({ ...v, description: "", address: "" })); setPhotos([]); }}>
              File another
            </Button>
            <Button onClick={() => navigate({ to: "/citizen/reports" })}>
              View my reports
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Offline Status Warning banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-3 mb-4 flex items-center gap-2 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>You are currently offline. Your inputs will be auto-saved locally and submitted when your network restores.</span>
        </div>
      )}

      <PageHeader title="New report" subtitle="Tell us what's happening — be as specific as possible." />

      {submitError ? (
        <div className="mb-4 border-2 border-red-500 bg-red-50 p-3 text-sm text-red-700 rounded-lg">
          {submitError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-6">
        
        {/* Main report form cards */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Category" value={values.category} onChange={set("category")}>
              {categories.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </SelectField>
            <SelectField label="Priority" value={values.priority} onChange={set("priority")}>
              {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </SelectField>
          </div>

          <div className="relative">
            <TextareaField
              label="Description"
              value={values.description}
              onChange={set("description")}
              error={errors.description}
              placeholder="What did you see? When?"
            />
            {/* Dictation voice assistant */}
            <button
              type="button"
              onClick={triggerDictation}
              className={classNames(
                "absolute right-3 bottom-3 p-1.5 rounded-full border text-xs flex items-center gap-1 transition-all",
                dictating ? "bg-red-500 text-white border-red-500 animate-pulse" : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
              title="Dictate with voice"
            >
              <Mic className="w-3.5 h-3.5" />
              {dictating && <span>Listening...</span>}
            </button>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-3">
              <FormField
                label="Address"
                value={values.address}
                onChange={set("address")}
                error={errors.address}
                placeholder="123 Maple St"
              />
            </div>
            <Button type="button" variant="secondary" onClick={geocodeAddress} loading={geocoding} className="w-full">
              Locate Address
            </Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <FormField label="Latitude" value={values.latitude} onChange={set("latitude")} error={errors.latitude} />
            <FormField label="Longitude" value={values.longitude} onChange={set("longitude")} error={errors.longitude} />
            <Button type="button" variant="secondary" onClick={detect} loading={geoLoading}>
              <MapPin className="w-4 h-4" /> Auto-detect
            </Button>
          </div>

          {/* Leaflet Map container */}
          <div className="relative">
            <div ref={mapRef} className="h-[250px] w-full rounded-md border-2 border-ink-950 shadow-[2px_2px_0_0_#0a0f0a] z-0 overflow-hidden" />
            
            {/* Interactive Recycling Hubs Map Overlay toggle */}
            <button
              type="button"
              onClick={() => setShowRecycleHubs(!showRecycleHubs)}
              className={classNames(
                "absolute top-3 right-3 p-2 rounded-lg border-2 border-ink-950 font-display font-semibold text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_#0a0f0a] z-[1000]",
                showRecycleHubs ? "bg-forest-500 text-ink-950" : "bg-card text-muted-foreground"
              )}
            >
              <Recycle className="w-4 h-4" />
              {showRecycleHubs ? "Recycle Hubs Active" : "Show Recycle Hubs"}
            </button>
          </div>
        </Card>

        {/* Sidebar panels */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <div className="text-sm font-medium">Photos</div>
              <div className="text-xs text-muted-foreground">Up to 4 images</div>
            </div>
            <label className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-sand-50">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Click to upload</div>
              <div className="text-xs text-muted-foreground">PNG, JPG up to 10MB</div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
            </label>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, i) => {
                  const url = URL.createObjectURL(p);
                  return (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={url} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-ink-950/70 text-white rounded-full p-1"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <FormField label="Block (optional)" value={values.block} onChange={set("block")} placeholder="e.g. B-12" />
            <Button className="w-full mt-4" type="submit">Submit report</Button>
          </Card>

          {/* Help & FAQ Accordion panel */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-forest-600" /> FAQ & Guidelines
            </h3>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border border-border/80 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-3 text-left bg-sand-50/50 hover:bg-sand-100/50 flex justify-between items-center text-xs font-semibold"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={classNames("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen ? "rotate-185" : "")} />
                    </button>
                    {isOpen && (
                      <div className="p-3 text-xs text-muted-foreground leading-relaxed border-t border-border/60 bg-card">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

      </form>
    </>
  );
}
