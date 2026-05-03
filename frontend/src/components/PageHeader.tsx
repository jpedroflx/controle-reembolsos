import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <Flex align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} justify="space-between">
      <Stack spacing={1}>
        {eyebrow ? (
          <Text color="red.600" fontSize="xs" fontWeight="bold" textTransform="uppercase">
            {eyebrow}
          </Text>
        ) : null}
        <Heading size="lg">{title}</Heading>
        {description ? <Text color="gray.600">{description}</Text> : null}
      </Stack>
      {actions ? <Flex justify={{ base: "stretch", md: "flex-end" }}>{actions}</Flex> : null}
    </Flex>
  );
}
