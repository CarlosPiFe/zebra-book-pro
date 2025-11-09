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
    <div className="space-y-6 animate-fade-in">
      {/* Tabs Header */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("employees")}
            className={cn(
              "flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-all",
              activeTab === "employees"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            <Users className="h-5 w-5" />
            Empleados
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={cn(
              "flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-all",
              activeTab === "customers"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            <UserCheck className="h-5 w-5" />
            Clientes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === "employees" ? (
          <EmployeesView businessId={businessId} />
        ) : (
          <CustomersView businessId={businessId} />
        )}
      </div>
    </div>
  );
}
