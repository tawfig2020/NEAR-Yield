import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface Transaction {
  hash: string;
  type: string;
  amount: string;
  timestamp: number;
  status: string;
}

const TransactionHistory: React.FC = () => {
  const { wallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (wallet) {
        // TODO: Implement actual transaction fetching
        const mockTransactions: Transaction[] = [
          {
            hash: '0x123...abc',
            type: 'Deposit',
            amount: '100 NEAR',
            timestamp: Date.now() - 3600000,
            status: 'Completed'
          },
          {
            hash: '0x456...def',
            type: 'Withdraw',
            amount: '50 NEAR',
            timestamp: Date.now() - 7200000,
            status: 'Completed'
          }
        ];
        setTransactions(mockTransactions);
      }
    };

    fetchTransactions();
  }, [wallet]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Transaction History
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hash</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.hash}>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell>{formatDate(tx.timestamp)}</TableCell>
                  <TableCell>{tx.status}</TableCell>
                  <TableCell>{tx.hash}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
