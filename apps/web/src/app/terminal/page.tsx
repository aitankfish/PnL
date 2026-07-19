import type { Metadata } from 'next';
import TerminalClient from './TerminalClient';

export const metadata: Metadata = {
  title: 'Terminal — PNL',
  description:
    'A minimal realtime trading terminal — live onchain price, one moving point, and a single up/down call.',
};

export default function TerminalPage() {
  return <TerminalClient />;
}
