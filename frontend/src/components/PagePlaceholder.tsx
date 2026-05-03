import { Badge, Box, Heading, Stack, Text } from "@chakra-ui/react";

type PagePlaceholderProps = {
  title: string;
  description: string;
  badge?: string;
};

export function PagePlaceholder({ badge = "Base", description, title }: PagePlaceholderProps) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
      <Stack spacing={3}>
        <Badge alignSelf="flex-start" colorScheme="red">
          {badge}
        </Badge>
        <Heading color="gray.900" size="lg">
          {title}
        </Heading>
        <Text color="gray.600">{description}</Text>
      </Stack>
    </Box>
  );
}
