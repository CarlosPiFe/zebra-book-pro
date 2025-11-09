import { useState } from "react";
import { Users, UserCheck } from "lucide-react";
import { EmployeesView } from "./EmployeesView";
import { CustomersView } from "./CustomersView";
import { cn } from "@/lib/utils";

interface PeopleViewProps {
  businessId: string;
}

type ActiveTab = "employees" | "customers";

export function PeopleView({ businessId }: PeopleViewProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("employees");

  return (
    <div className="animate-fade-in">
      {/* Tabs Header - Sticky */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("employees")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-all text-sm",
              activeTab === "employees"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            <Users className="h-4 w-4" />
            Empleados
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-all text-sm",
              activeTab === "customers"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            <UserCheck className="h-4 w-4" />
            Clientes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">
        {activeTab === "employees" ? (
          <EmployeesView businessId={businessId} />
        ) : (
          <CustomersView businessId={businessId} />
        )}
      </div>
    </div>
  );
}
