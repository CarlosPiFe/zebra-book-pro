import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UtensilsCrossed, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: "plato" | "bebida";
}

interface MenuViewProps {
  businessId: string;
}

export function MenuView({ businessId }: MenuViewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "plato" as "plato" | "bebida",
  });

  useEffect(() => {
    loadMenuItems();
  }, [businessId]);

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("business_id", businessId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setMenuItems((data || []) as MenuItem[]);
    } catch (error) {
      console.error("Error loading menu items:", error);
      toast.error("Error al cargar el menú");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        category: item.category,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "plato",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    try {
      const itemData = {
        business_id: businessId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category: formData.category,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Artículo actualizado correctamente");
      } else {
        const { error } = await supabase.from("menu_items").insert(itemData);

        if (error) throw error;
        toast.success("Artículo añadido correctamente");
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: "", description: "", price: "", category: "plato" });
      loadMenuItems();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Error al guardar el artículo");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

      if (error) throw error;

      toast.success("Artículo eliminado correctamente");
      loadMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Error al eliminar el artículo");
    }
  };

  const platos = menuItems.filter((item) => item.category === "plato");
  const bebidas = menuItems.filter((item) => item.category === "bebida");

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando menú...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gestión del Menú</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Artículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Artículo" : "Añadir Artículo"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del plato o bebida
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Paella Valenciana"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "plato" | "bebida") =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plato">Plato</SelectItem>
                    <SelectItem value="bebida">Bebida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 12.50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del plato o bebida"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveItem}>
                {editingItem ? "Actualizar" : "Añadir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {/* Platos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Platos
            </CardTitle>
            <CardDescription>
              {platos.length} {platos.length === 1 ? "plato" : "platos"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {platos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay platos añadidos
              </p>
            ) : (
              <div className="space-y-2">
                {platos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{item.price.toFixed(2)} €</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bebidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wine className="h-5 w-5" />
              Bebidas
            </CardTitle>
            <CardDescription>
              {bebidas.length} {bebidas.length === 1 ? "bebida" : "bebidas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bebidas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay bebidas añadidas
              </p>
            ) : (
              <div className="space-y-2">
                {bebidas.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{item.price.toFixed(2)} €</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
