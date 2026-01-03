// Use database API instead of Base44
import {
  Transaction,
  Customer,
  Category,
  Sale,
  Installment,
  Supplier,
  Purchase,
  PurchaseInstallment
} from './database';

// Helper to handle API response formats
const wrapList = (Entity) => ({
  ...Entity,
  list: async (...args) => {
    const response = await Entity.list(...args);
    return Array.isArray(response) ? response : (response?.data || []);
  }
});

const WrappedCustomer = wrapList(Customer);
const WrappedSupplier = wrapList(Supplier);
const WrappedTransaction = wrapList(Transaction);

export {
  WrappedTransaction as Transaction,
  WrappedCustomer as Customer,
  Category,
  Sale,
  Installment,
  WrappedSupplier as Supplier,
  Purchase,
  PurchaseInstallment
};

// Fallback for User if needed
export const User = { auth: {} };