import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  quantity: number;
  created_at: string;
  menu_items: {
    name: string;
    price: number;
  };
}

interface OrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  orders: Order[];
  totalAmount: number;
}

export const OrdersDialog = ({ open, onOpenChange, tableNumber, orders, totalAmount }: OrdersDialogProps) => {
  const groupedOrders = orders.reduce((acc, order) => {
    const key = order.menu_items.name;
    if (!acc[key]) {
      acc[key] = {
        name: order.menu_items.name,
        price: order.menu_items.price,
        quantity: 0,
        total: 0,
      };
    }
    acc[key].quantity += order.quantity;
    acc[key].total += order.menu_items.price * order.quantity;
    return acc;
  }, {} as Record<string, { name: string; price: number; quantity: number; total: number }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedido - Mesa {tableNumber}</DialogTitle>
        </DialogHeader>
        
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay pedidos para esta mesa
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {Object.values(groupedOrders).map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${item.price} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-bold text-lg">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-2xl text-primary">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
