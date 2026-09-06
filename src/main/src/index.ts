import { app } from "electron";
import { MainApp } from "./app/mainApp";

if (!app.requestSingleInstanceLock()) app.quit();
else {
  const mainApp = new MainApp();
  mainApp.start();
}
