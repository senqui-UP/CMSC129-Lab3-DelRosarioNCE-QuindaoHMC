import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Outlet } from "react-router-dom";
import { Chatbot } from "../../chatbot/Chatbot";

export const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Header />

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <Footer />
      <Chatbot />
    </div>
  );
};
