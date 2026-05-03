import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  components: {
    Button: {
      defaultProps: {
        colorScheme: "red"
      }
    },
    Table: {
      baseStyle: {
        th: {
          letterSpacing: "0",
          textTransform: "none"
        }
      }
    }
  },
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
        bg: "gray.50",
        color: "gray.900"
      }
    }
  }
});
