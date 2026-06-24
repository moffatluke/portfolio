// Returns the most similar knowledge-base chunks for a query embedding.
export async function retrieve(supabase, queryEmbedding, matchCount = 5) {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })
  if (error) throw error
  return data
}
