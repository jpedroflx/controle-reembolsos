export type Category = {
  id: string;
  name: string;
  active: boolean;
  maxAmount: number | null;
  attachmentRequiredAboveAmount: number | null;
  createdAt: string;
  updatedAt: string;
};
