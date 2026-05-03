import { Badge, Box, Heading, Stack, Text } from "@chakra-ui/react";

type PagePlaceholderProps = {
  title: string;
  description: string;
  badge?: string;
};

export function PagePlaceholder({ badge = "Base", description, title }: PagePlaceholderProps) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={{ base: 5, md: 6 }}>
      <Stack spacing={3}>
        <Badge alignSelf="flex-start" colorScheme="red" rounded="full">
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
