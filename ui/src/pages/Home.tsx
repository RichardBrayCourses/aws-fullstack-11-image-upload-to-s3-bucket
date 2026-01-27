import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HomeProps = {
  searchQuery: string;
};

export default ({ searchQuery }: HomeProps) => {
  const [loading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<null | {
    id: string;
    title: string;
    description: string;
    small: string;
    large: string;
  }>(null);

  const photos = [
    {
      id: "photo-1500530855697-b586d89ba3ee",
      title: "Misty Forest",
      description: "Soft light over a quiet evergreen canopy.",
      small:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=90",
    },
    {
      id: "photo-1470770841072-f978cf4d019e",
      title: "Mountain Trail",
      description: "A winding path through alpine terrain.",
      small:
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2200&q=90",
    },
    {
      id: "photo-1469474968028-56623f02e42e",
      title: "City Glow",
      description: "Evening light across a lively skyline.",
      small:
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=90",
    },
    {
      id: "photo-1494526585095-c41746248156",
      title: "Desert Lines",
      description: "Warm dunes shaped by the wind.",
      small:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=2200&q=90",
    },
    {
      id: "photo-1482192596544-9eb780fc7f66",
      title: "Ocean Cliff",
      description: "Waves rolling into rugged coastline.",
      small:
        "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=2200&q=90",
    },
    {
      id: "photo-1500534314209-a25ddb2bd429",
      title: "Golden Field",
      description: "Late sun over a wide open meadow.",
      small:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80",
      large:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2200&q=90",
    },
  ];

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [selectedPhoto]);

  if (loading) return <p className="p-4 text-muted-foreground">Loading...</p>;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPhotos = normalizedQuery
    ? photos.filter(
        (photo) =>
          photo.title.toLowerCase().includes(normalizedQuery) ||
          photo.description.toLowerCase().includes(normalizedQuery),
      )
    : photos;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">🎨 Uptick Art Gallery</h1>
      {/* Card moved to Profile page */}
      <p className="text-muted-foreground text-lg mb-8">
        Welcome to our digital art collection.
      </p>
      {filteredPhotos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
          No matching artwork. Try a different search.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPhoto(photo)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPhoto(photo);
                }
              }}
              aria-label={`Open ${photo.title} preview`}
            >
              <CardContent className="p-0">
                <img
                  src={photo.small}
                  alt={photo.title}
                  className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </CardContent>
              <CardHeader>
                <CardTitle className="text-xl">{photo.title}</CardTitle>
                <p className="text-muted-foreground">{photo.description}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedPhoto.large}
              alt={selectedPhoto.title}
              className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-xl"
            />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white transition hover:bg-black"
              aria-label="Close image preview"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
