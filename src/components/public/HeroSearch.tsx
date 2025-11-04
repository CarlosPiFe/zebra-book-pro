import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingDate, setBookingDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [partySize, setPartySize] = useState("2");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (bookingDate) {
      const isoString = bookingDate.toISOString();
      const dateStr = isoString.split("T")[0] || isoString;
      params.append("date", dateStr);
    }
    if (startTime) params.append("time", startTime);
    if (partySize) params.append("people", partySize);
    
    const queryStr = params.toString();
    navigate(queryStr ? `/search?${queryStr}` : "/search");
  };

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Busca y reserva los mejores restaurantes
          </h1>
          <p className="text-lg text-muted-foreground">
            Descubre cerca de ti
          </p>
        </div>

        <Card className="p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Restaurante, tipo de cocina o ubicación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12"
              />
            </div>
            
            <DatePicker
              date={bookingDate}
              onDateChange={setBookingDate}
            />

            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Hora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="13:00">13:00</SelectItem>
                <SelectItem value="13:30">13:30</SelectItem>
                <SelectItem value="14:00">14:00</SelectItem>
                <SelectItem value="14:30">14:30</SelectItem>
                <SelectItem value="20:00">20:00</SelectItem>
                <SelectItem value="20:30">20:30</SelectItem>
                <SelectItem value="21:00">21:00</SelectItem>
                <SelectItem value="21:30">21:30</SelectItem>
                <SelectItem value="22:00">22:00</SelectItem>
              </SelectContent>
            </Select>

            <Select value={partySize} onValueChange={setPartySize}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Personas" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "persona" : "personas"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="lg"
            className="w-full md:w-auto mt-4 md:ml-auto md:block h-12 px-8"
            onClick={handleSearch}
          >
            <Search className="h-5 w-5 mr-2" />
            Buscar
          </Button>
        </Card>
      </div>
    </div>
  );
};