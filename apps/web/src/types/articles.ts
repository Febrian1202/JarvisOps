export type ArticleStatus = 'draft' | 'published';

export interface KnowledgeCategory {
  id: number;
  name: string;
  description: string | null;
  articles_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeArticleListItem {
  id: number;
  title: string;
  slug: string;
  category: { id: number; name: string } | null;
  author: { id: number; name: string; email: string } | null;
  status: ArticleStatus;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticleDetail extends KnowledgeArticleListItem {
  content: string;
  related_articles?: KnowledgeArticleListItem[];
}
