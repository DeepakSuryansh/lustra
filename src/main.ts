import "./styles/app.css";
import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("#app root missing");
}
mountApp(root);
