import {createRoot} from "react-dom/client";
import RoutePlanner from "../app/route-planner";
import ThemeProvider from "../app/theme-provider";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<ThemeProvider><RoutePlanner /></ThemeProvider>);
