import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MyReviewsProps {
  userId: string;
}

interface PendingBooking {
  id: string;
  booking_date: string;
  start_time: string;
  party_size: number;
  businesses: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  businesses: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

export const MyReviews = ({ userId }: MyReviewsProps) => {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null);
  const [rating, setRating] = useState<number[]>([5]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar reservas completadas sin opinión
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          start_time,
          party_size,
          businesses (
            id,
            name,
            image_url
          )
        `)
        .eq("client_id", userId)
        .eq("status", "completed")
        .is("reviews.id", null)
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Filtrar las que no tienen opinión
      const bookingsWithoutReviews = [];
      for (const booking of bookingsData || []) {
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", booking.id)
          .maybeSingle();

        if (!existingReview) {
          bookingsWithoutReviews.push(booking);
        }
      }

      setPendingBookings(bookingsWithoutReviews as any);

      // Cargar mis opiniones publicadas
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          businesses (
            id,
            name,
            image_url
          )
        `)
        .eq("client_id", userId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;
      setMyReviews(reviewsData as any || []);
    } catch (error) {
      console.error("Error cargando opiniones:", error);
      toast.error("Error al cargar las opiniones");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    const ratingValue = rating[0] ?? 5;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .insert([{
          business_id: selectedBooking.businesses.id,
          client_id: userId,
          booking_id: selectedBooking.id,
          rating: ratingValue,
          comment: comment.trim() || null,
        }]);

      if (error) throw error;

      toast.success("¡Opinión publicada!");
      setDialogOpen(false);
      setSelectedBooking(null);
      setRating([5]);
      setComment("");
      loadData();
    } catch (error) {
      console.error("Error publicando opinión:", error);
      toast.error("Error al publicar la opinión");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Pendientes de opinión */}
      {pendingBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pendientes de opinión</h3>
          <div className="grid gap-4">
            {pendingBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {booking.businesses.image_url && (
                      <img
                        src={booking.businesses.image_url}
                        alt={booking.businesses.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{booking.businesses.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                    <Dialog open={dialogOpen && selectedBooking?.id === booking.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) {
                        setSelectedBooking(null);
                        setRating([5]);
                        setComment("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Dejar opinión
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Opinar sobre {booking.businesses.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Valoración: {rating[0]}/10</Label>
                            <Slider
                              value={rating}
                              onValueChange={setRating}
                              max={10}
                              step={1}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Comentario (opcional)</Label>
                            <Textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Cuéntanos tu experiencia..."
                              rows={4}
                              className="mt-2"
                            />
                          </div>
                          <Button
                            onClick={handleSubmitReview}
                            disabled={submitting}
                            className="w-full"
                          >
                            {submitting ? "Publicando..." : "Publicar opinión"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mis opiniones publicadas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Mis opiniones publicadas</h3>
        {myReviews.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aún no has publicado ninguna opinión
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {review.businesses.image_url && (
                      <img
                        src={review.businesses.image_url}
                        alt={review.businesses.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{review.businesses.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <Star className="h-4 w-4 fill-primary" />
                          {review.rating}/10
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
