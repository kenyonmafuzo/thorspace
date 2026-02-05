import { Suspense } from "react";
import SelectShipsClient from "./SelectShipsClient";

export default function SelectShipsPage() {
  return (
    <Suspense fallback={null}>
      <SelectShipsClient />
    </Suspense>
  );
}