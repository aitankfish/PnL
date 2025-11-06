import { useState, useEffect } from 'react';

interface CoinGeckoPriceResponse {
  solana: {
    usd: number;
  };
}

export function useSolPrice() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch SOL price');
        }

        const data: CoinGeckoPriceResponse = await response.json();
        const price = data.solana?.usd;

        if (price) {
          setSolPrice(price);
          setError(null);
        } else {
          throw new Error('SOL price not found in response');
        }
      } catch (err) {
        console.error('Error fetching SOL price:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to a default price if API fails
        setSolPrice(162.53);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  return { solPrice, isLoading, error };
}
