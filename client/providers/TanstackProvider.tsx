"use client";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from "react";

const TanstackProvider = ({ children }: { children: React.ReactNode }) => {
  const [query, setQuery] = useState(new QueryClient());
  return <QueryClientProvider client={query}>{children}</QueryClientProvider>;
};

export default TanstackProvider;
