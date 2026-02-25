// feedStore.ts — Zustand store for shared article state
import { create } from 'zustand';
import { Article } from './articleService';

export const useFeedStore = create<{
    articles: Article[];
    setArticles: (updateFn: (prev: Article[]) => Article[]) => void;
}>((set) => ({
    articles: [],
    setArticles: (updateFn) => set((state) => ({ articles: updateFn(state.articles) })),
}));
