import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Textarea
} from "@chakra-ui/react";
import { FormEvent, useEffect, useState } from "react";

import type { Category } from "../types/categories";
import type { ReimbursementFormPayload } from "../types/reimbursements";

type ReimbursementFormValues = {
  categoriaId: string;
  descricao: string;
  valor: string;
  dataDespesa: string;
};

type ReimbursementFormErrors = Partial<Record<keyof ReimbursementFormValues, string>>;

type ReimbursementFormProps = {
  categories: Category[];
  error?: string | null;
  initialValues?: ReimbursementFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (payload: ReimbursementFormPayload) => Promise<void>;
};

const emptyValues: ReimbursementFormValues = {
  categoriaId: "",
  descricao: "",
  valor: "",
  dataDespesa: ""
};

function toApiDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function validateForm(values: ReimbursementFormValues) {
  const errors: ReimbursementFormErrors = {};
  const amount = Number(values.valor);

  if (!values.descricao.trim()) {
    errors.descricao = "Informe a descricao.";
  }

  if (!values.categoriaId) {
    errors.categoriaId = "Selecione uma categoria ativa.";
  }

  if (!values.dataDespesa) {
    errors.dataDespesa = "Informe a data da despesa.";
  }

  if (!values.valor) {
    errors.valor = "Informe o valor.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.valor = "O valor deve ser maior que zero.";
  }

  return errors;
}

export function ReimbursementForm({
  categories,
  error,
  initialValues,
  isSubmitting,
  submitLabel,
  onCancel,
  onSubmit
}: ReimbursementFormProps) {
  const [values, setValues] = useState<ReimbursementFormValues>(initialValues ?? emptyValues);
  const [errors, setErrors] = useState<ReimbursementFormErrors>({});

  useEffect(() => {
    setValues(initialValues ?? emptyValues);
    setErrors({});
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      categoriaId: values.categoriaId,
      descricao: values.descricao.trim(),
      valor: Number(values.valor),
      dataDespesa: toApiDate(values.dataDespesa)
    });
  }

  return (
    <Box as="form" noValidate onSubmit={handleSubmit}>
      <Stack bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={{ base: 5, md: 6 }} spacing={5}>
        {error ? (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}

        <FormControl isInvalid={Boolean(errors.descricao)} isRequired>
          <FormLabel>Descricao</FormLabel>
          <Textarea
            focusBorderColor="red.500"
            minH="120px"
            value={values.descricao}
            onChange={(event) => setValues((current) => ({ ...current, descricao: event.target.value }))}
          />
          <FormErrorMessage>{errors.descricao}</FormErrorMessage>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl isInvalid={Boolean(errors.categoriaId)} isRequired>
            <FormLabel>Categoria</FormLabel>
            <Select
              focusBorderColor="red.500"
              placeholder="Selecione uma categoria"
              value={values.categoriaId}
              onChange={(event) => setValues((current) => ({ ...current, categoriaId: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <FormErrorMessage>{errors.categoriaId}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={Boolean(errors.valor)} isRequired>
            <FormLabel>Valor</FormLabel>
            <Input
              focusBorderColor="red.500"
              min="0.01"
              step="0.01"
              type="number"
              value={values.valor}
              onChange={(event) => setValues((current) => ({ ...current, valor: event.target.value }))}
            />
            <FormErrorMessage>{errors.valor}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={Boolean(errors.dataDespesa)} isRequired>
            <FormLabel>Data da despesa</FormLabel>
            <Input
              focusBorderColor="red.500"
              type="date"
              value={values.dataDespesa}
              onChange={(event) => setValues((current) => ({ ...current, dataDespesa: event.target.value }))}
            />
            <FormErrorMessage>{errors.dataDespesa}</FormErrorMessage>
          </FormControl>
        </SimpleGrid>

        <ButtonGroup flexDirection={{ base: "column-reverse", sm: "row" }} gap={2} justifyContent="flex-end" spacing={0}>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button colorScheme="red" isLoading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}
