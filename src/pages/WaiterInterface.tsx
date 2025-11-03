import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Waiter {
  id: string;
  name: string;
  business_id: string;
}

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

const WaiterInterface = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [waiter, setWaiter] = useState<Waiter | null>(null);
  const [waiterName, setWaiterName] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaiter();
  }, [token]);

  const loadWaiter = async () => {
    if (!token) {
      toast.error("Token no encontrado");
      navigate("/");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .rpc("get_waiter_by_token", { _token: token });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Link inválido");
        navigate("/");
        return;
      }

      const waiterData = data[0];
      if (!waiterData) {
        toast.error("No se encontró información del camarero");
        navigate("/");
        return;
      }
      
      setWaiter(waiterData);
      loadTables(waiterData.business_id);
      loadMenuItems(waiterData.business_id);
    } catch (error) {
      console.error("Error loading waiter:", error);
      toast.error("Error al cargar información");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number");

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  };

  const loadMenuItems = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("business_id", businessId)
        .order("category", { ascending: true });

      if (error) throw error;
      setMenuItems(data as any || []);
    } catch (error) {
      console.error("Error loading menu:", error);
    }
  };

  const handleNameSubmit = () => {
    if (!waiterName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    setShowNameForm(false);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} agregado`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const handleSubmitOrder = async () => {
    if (!selectedTable || cart.length === 0) {
      toast.error("Selecciona una mesa y agrega items");
      return;
    }

    try {
      const orders = cart.map((item) => ({
        table_id: selectedTable.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        waiter_id: waiter?.id,
        status: "pending",
      }));

      const { error } = await supabase.from("orders").insert(orders);

      if (error) throw error;

      toast.success("Pedido enviado exitosamente");
      setCart([]);
      setSelectedTable(null);
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Error al enviar pedido");
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const category = item?.category || "Sin categoría";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return <LoadingSpinner fullScreen text="Cargando interfaz..." />;
  }

  if (showNameForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4">Bienvenido Camarero</h1>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ingresa tu nombre</Label>
              <Input
                id="name"
                value={waiterName}
                onChange={(e) => setWaiterName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <Button onClick={handleNameSubmit} className="w-full">
              Continuar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">
            {waiterName} - {selectedTable ? `Mesa ${selectedTable.table_number}` : "Selecciona una mesa"}
          </h1>
        </div>
      </div>

      <div className="container mx-auto p-4 pb-24">
        {!selectedTable ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Selecciona una Mesa</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tables.map((table) => (
                <Card
                  key={table.id}
                  className="p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedTable(table)}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{table.table_number}</div>
                    <div className="text-sm text-muted-foreground">
                      Capacidad: {table.max_capacity}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Menú</h2>
              <Button variant="outline" onClick={() => setSelectedTable(null)}>
                Cambiar Mesa
              </Button>
            </div>

            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-xl font-semibold capitalize">{category}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="text-lg font-bold ml-2">${item.price}</div>
                      </div>
                      <Button onClick={() => addToCart(item)} size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Pedido ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
              </h3>
              <div className="text-xl font-bold">
                ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-7 w-7 p-0"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleSubmitOrder} className="w-full" size="lg">
              Enviar Pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterInterface;
