import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description?: string;
  framed?: boolean;
  title: string;
};

export function EmptyState({ action, description, framed = true, title }: EmptyStateProps) {
  const content = (
      <Stack align="center" spacing={3}>
        <Heading size="md">{title}</Heading>
        {description ? (
          <Text color="gray.500" maxW="lg">
            {description}
          </Text>
        ) : null}
        {action ? <Box pt={1}>{action}</Box> : null}
      </Stack>
  );

  if (!framed) {
    return <Box textAlign="center">{content}</Box>;
  }

  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={{ base: 6, md: 8 }} textAlign="center">
      {content}
    </Box>
  );
}
