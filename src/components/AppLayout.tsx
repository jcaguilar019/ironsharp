import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col pb-16">
    <div className="flex-1">{children}</div>
    <BottomNav />
  </div>
);

export default AppLayout;