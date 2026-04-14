import { useAsync } from './useAsync';
import { getPosts, getCategoriasBlog } from '../services/blog.service';
import type { PostBlog, CategoriaBlog } from '../types';

export function usePosts(apenasPublicados = false) {
  return useAsync<PostBlog[]>(() => getPosts(apenasPublicados), [], [apenasPublicados]);
}

export function useCategoriasBlog() {
  return useAsync<CategoriaBlog[]>(getCategoriasBlog, []);
}
