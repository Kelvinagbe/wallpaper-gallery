import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  thumbnail: string | null;
  category: string | null;
  tags: string[];
  is_public: boolean;
  views: number;
  downloads: number;
  created_at: string;
  updated_at: string;
  rank: number;
}

export const useSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_wallpapers', {
        search_query: query.trim()
      });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return { results, isSearching, search };
};