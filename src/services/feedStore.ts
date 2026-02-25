// feedStore.ts — Zustand store for articles & fetch timestamps
import { create } from 'zustand';
import { Article } from './articleService';

export const useFeedStore = create<{
    articles: Article[];
    lastFetchTime: number | null;
    setArticles: (updateFn: (prev: Article[]) => Article[]) => void;
    updateLastFetchTime: (timestamp: number) => void;
}>((set) => ({
    articles: [],
    lastFetchTime: null,
    setArticles: (updateFn) => set((state) => ({ articles: updateFn(state.articles) })),
    updateLastFetchTime: (timestamp) => set(() => ({ lastFetchTime: timestamp })),
}));
