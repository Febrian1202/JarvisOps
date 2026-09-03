export type ArticleStatus = 'draft' | 'published';

export interface KnowledgeCategory {
  id: number;
  name: string;
  description: string | null;
  articles_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ArticleAuthor {
  id: number;
  full_name: string;
}

export interface KnowledgeArticleListItem {
  id: number;
  title: string;
  slug: string;
  category: { id: number; name: string } | null;
  author: ArticleAuthor | null;
  status: ArticleStatus;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  view_count: number;
}

export interface KnowledgeArticleDetail extends KnowledgeArticleListItem {
  content: string;
  related_articles?: RelatedArticle[];
}
