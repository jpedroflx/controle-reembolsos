import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  colors: {
    brand: {
      500: "#c8102e",
      600: "#9f0f24"
    }
  },
  fonts: {
    body: "Inter, system-ui, sans-serif",
    heading: "Inter, system-ui, sans-serif"
  },
  styles: {
    global: {
      body: {
        color: "gray.900"
      }
    }
  }
});
